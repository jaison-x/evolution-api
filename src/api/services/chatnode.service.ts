import axios from 'axios';

import { Chatnode, ConfigService } from '../../config/env.config';
import { Logger } from '../../config/logger.config';
import { ActiveHoursConfig, ChatnodeDto } from '../dto/chatnode.dto';
import { InstanceDto } from '../dto/instance.dto';
import { ChatnodeRaw } from '../models';
import { RepositoryBroker } from '../repository/repository.manager';
import { ChatwootService } from './chatwoot.service';
import { WAMonitoringService } from './monitor.service';

export class ChatnodeService {
  constructor(
    private readonly waMonitor: WAMonitoringService,
    private readonly repository: RepositoryBroker,
    private readonly configService: ConfigService,
    private readonly chatwootService: ChatwootService,
  ) {}

  private readonly logger = new Logger(ChatnodeService.name);
  private chatnode_without_answer = 'Não consigo ajudar você';

  public create(instance: InstanceDto, data: ChatnodeDto) {
    this.logger.verbose('create chatnodeservice: ' + instance.instanceName);
    this.waMonitor.waInstances[instance.instanceName].setChatnode(data);

    return { chatnode: { ...instance, chatnode: data } };
  }

  public async find(instance: InstanceDto): Promise<ChatnodeDto> {
    try {
      this.logger.verbose('find chatnode: ' + instance.instanceName);
      const result = await this.waMonitor.waInstances[instance.instanceName].findChatnode();

      if (Object.keys(result).length === 0) {
        throw new Error('Chatnode not found');
      }

      return result;
    } catch (error) {
      return { enabled: false, bot_id: null, sign_name: '' };
    }
  }

  private getTypeMessage(msg: any) {
    this.logger.verbose('get type message');

    const types = {
      conversation: msg.conversation,
      extendedTextMessage: msg.extendedTextMessage?.text,
    };

    this.logger.verbose('type message: ' + types);

    return types;
  }

  private getMessageContent(types: any) {
    this.logger.verbose('get message content');
    const typeKey = Object.keys(types).find((key) => types[key] !== undefined);

    const result = typeKey ? types[typeKey] : undefined;

    this.logger.verbose('message content: ' + result);

    return result;
  }

  private getConversationMessage(msg: any) {
    this.logger.verbose('get conversation message');

    const types = this.getTypeMessage(msg);

    const messageContent = this.getMessageContent(types);

    this.logger.verbose('conversation message: ' + messageContent);

    return messageContent;
  }

  public getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  public hasEmoji(str: string): boolean {
    return /\p{Extended_Pictographic}/u.test(str);
  }

  public getRandomEmoji(): string {
    const emojis = ['➡️', '💉', '✨', '💕', '👑', '🙏🏼', '⭐️', '✅', '👉', '🎉', '⚡', '❤️', '✔️', '🔴', '🟢', '🏥'];

    return emojis[this.getRandomInt(emojis.length)];
  }

  public formatMessage(message: string) {
    let needsEmoji = false;

    return message
      .split(/\.\s|!\s/g)
      .map((str, i, arr) => {
        if (i < arr.length - 1) {
          const prependEmoji = needsEmoji && !this.hasEmoji(str) ? `${this.getRandomEmoji()} ` : '';
          const needsBreakLine = i > 0 && (i + 1) % 2 === 0;
          needsEmoji = needsBreakLine;
          return prependEmoji + str + (needsBreakLine ? `.\n\n` : '. ');
        } else {
          return str;
        }
      })
      .join('');
  }

  public isInActiveHour(chatnode: ChatnodeDto): boolean {
    const date = new Date();
    if (chatnode?.active_hours && chatnode.active_hours[date.getDay()]) {
      return chatnode.active_hours[date.getDay()].some((config: ActiveHoursConfig) => {
        const configDateIni = new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${config.ini}`);
        const configDateEnd = new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${config.end}`);

        return date.getTime() >= configDateIni.getTime() && date.getTime() <= configDateEnd.getTime();
      });
    }

    return false;
  }

  public isAlwaysActiveNumber(findchatnode: ChatnodeRaw, remoteJid: string): boolean {
    return findchatnode.numbers_always_active?.some((number) => remoteJid.includes(number));
  }

  public isResponseWithoutAnswer(response: string): boolean {
    return response.includes(this.chatnode_without_answer);
  }

  public isGroup(remoteJid: string): boolean {
    return remoteJid.includes('@g.us');
  }

  public isRecentMessage(msg: any): boolean {
    return (new Date().getTime() - (msg.messageTimestamp as number) * 1000) / 1000 / 60 < 1;
  }

  public async hasRecentAttendMessage(instance: InstanceDto, remoteJid: string): Promise<boolean> {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 5);
    const minTimestamp = date.getTime();

    const messages = await this.repository.message.find({
      where: {
        key: { remoteJid: remoteJid, fromMe: true },
        owner: instance.instanceName,
        isBot: false,
        //messageTimestamp: { $gt: minTimestamp },
      },
      limit: 1,
    });
    const messagesFiltered = messages.filter((message) => (message.messageTimestamp as number) >= minTimestamp / 1000);

    return messagesFiltered.length > 0;
  }

  public async sendLabelsToChatwoot(instance: InstanceDto, msg: any, responseBot: string) {
    const chatwoot = await this.waMonitor.waInstances[instance.instanceName].findChatwoot();

    if (chatwoot?.enabled) {
      this.logger.verbose('get conversation in chatwoot');
      const getConversation = await this.chatwootService.createConversation(instance, msg);

      if (!getConversation) {
        this.logger.warn('conversation not found');
        return;
      }

      const labels = ['robô'];
      if (this.isResponseWithoutAnswer(responseBot)) {
        labels.push('robô-sem-resposta');
      }

      this.chatwootService.addLabels(instance, getConversation, labels);
    }
  }

  public async generateResponseFromChatnode(remoteJid: string, msg: any, chatnode: ChatnodeDto): Promise<string> {
    const apiKey = this.configService.get<Chatnode>('CHATNODE').API_KEY;
    if (!apiKey) {
      return '';
    }

    //const chatSessionId = remoteJid + '.' + Math.random().toString().substring(0, 5);
    const chatSessionId = remoteJid;
    let chatnodeResponse = '';

    const response = await axios.post(
      `https://api.public.chatnode.ai/v1/${chatnode.bot_id}`,
      {
        message: msg,
        chat_session_id: chatSessionId,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (response.status === 200 && response.data?.message) {
      if (chatnode.sign_name) {
        chatnodeResponse = `*${chatnode.sign_name}:*\n\n`;
      }

      const countBr = response.data?.message.match(/[^\n]*\n[^\n]*/gi);
      if (!countBr || countBr < 3) {
        chatnodeResponse = chatnodeResponse + this.formatMessage(response.data?.message);
      } else {
        chatnodeResponse = chatnodeResponse + response.data?.message;
      }
    }

    return chatnodeResponse;
  }

  public async sendChatnode(instance: InstanceDto, remoteJid: string, msg: any): Promise<string> {
    this.logger.verbose('generating response in chatnodeservice for instance: ' + instance.instanceName);

    if (this.isGroup(remoteJid)) {
      this.logger.verbose('message is group. Ignored by chatnode.');
      return;
    }

    if (!this.isRecentMessage(msg)) {
      this.logger.verbose('message is not recent. Ignored by chatnode.');
      return;
    }

    const findchatnode = await this.find(instance);
    if (!findchatnode) {
      return;
    }

    let chatnodeResponse = '';

    if (findchatnode && findchatnode.bot_id) {
      const isActiveHour = this.isInActiveHour(findchatnode);
      const isAlwaysActiveNumber = this.isAlwaysActiveNumber(findchatnode, remoteJid);
      //const hasRecentAttendMessage = await this.hasRecentAttendMessage(instance, remoteJid);

      if (isActiveHour || isAlwaysActiveNumber) {
        if (msg) {
          // for now integration is disabled...
          return;
        }

        chatnodeResponse = await this.generateResponseFromChatnode(
          remoteJid,
          this.getConversationMessage(msg.message),
          findchatnode,
        );
      }

      if (chatnodeResponse) {
        this.sendMessageToWhatsApp(instance, remoteJid, chatnodeResponse);
        this.sendLabelsToChatwoot(instance, msg, chatnodeResponse);
      }
    }

    return chatnodeResponse;
  }

  public async sendMessageToWhatsApp(instance: InstanceDto, remoteJid: string, msg: any) {
    if (!this.isResponseWithoutAnswer(msg)) {
      this.waMonitor.waInstances[instance.instanceName].textMessage({
        number: remoteJid.split('@')[0],
        options: {
          delay: 1000,
          presence: 'composing',
          isBot: true,
        },
        textMessage: {
          text: msg,
        },
      });
    }
  }
}
