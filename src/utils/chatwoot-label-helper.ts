import ChatwootClient, { conversation } from '@figuro/chatwoot-sdk';
import { Label } from '@whiskeysockets/baileys/lib/Types/Label';
import { LabelAssociation } from '@whiskeysockets/baileys/lib/Types/LabelAssociation';

import { Logger } from '../config/logger.config';
import { postgresClient } from '../libs/postgres.client';
import { InstanceDto } from '../whatsapp/dto/instance.dto';
import { HandleLabelDto } from '../whatsapp/dto/label.dto';
import { ChatwootRaw, LabelRaw } from '../whatsapp/models';
import { RepositoryBroker } from '../whatsapp/repository/repository.manager';
import { WAMonitoringService } from '../whatsapp/services/monitor.service';

export class ChatwootLabel {
  private readonly logger = new Logger(ChatwootLabel.name);
  static tempLabels = new Map<
    string,
    {
      type: HandleLabelDto['action'];
      label: string;
      conversationId: number;
    }[]
  >();

  constructor(private readonly waMonitor: WAMonitoringService, private readonly repository: RepositoryBroker) {}

  public async getLabelsToAdd(provider: ChatwootRaw, message: string): Promise<string[]> {
    this.logger.verbose('getting regexes and testing to get necessary labels');
    const labels: string[] = [];

    let autoLabelConfig = provider?.auto_label_config || [];
    if (autoLabelConfig.length === 0 && provider?.auto_label) {
      const providerFallback = await this.repository.chatwoot.find('Lequia');
      if (providerFallback) {
        autoLabelConfig = providerFallback.auto_label_config;
      }
    }

    if (autoLabelConfig) {
      autoLabelConfig.forEach((config: any) => {
        if (config.regex.some((filter) => new RegExp(filter, 'gi').test(message))) {
          labels.push(config.label);
        }
      });
    }

    return labels;
  }

  public async processAutoLabel(
    client: ChatwootClient,
    provider: ChatwootRaw,
    instance: InstanceDto,
    conversation: number,
    remoteJid: string,
    message: string,
  ): Promise<string[]> {
    const autoLabel = provider?.auto_label || false;

    this.logger.verbose(`auto label is: ${autoLabel}`);
    if (!autoLabel) {
      return;
    }

    this.logger.verbose('searching if is to add labels');
    const labelsToAdd: string[] = await this.getLabelsToAdd(provider, message);

    if (labelsToAdd.length === 0) {
      this.logger.verbose('no labels to add');
      return labelsToAdd;
    }

    this.addLabels(client, provider, instance, conversation, labelsToAdd);
    this.addLabelsWhatsapp(instance, remoteJid, labelsToAdd);

    return labelsToAdd;
  }

  public async addLabels(
    client: ChatwootClient,
    provider: ChatwootRaw,
    instance: InstanceDto,
    conversation: number,
    labels: string[],
  ) {
    if (labels.length === 0) {
      return [];
    }

    const currentLabels: string[] = (
      await client.conversationLabels.list({
        accountId: parseInt(provider.account_id),
        conversationId: conversation,
      })
    ).payload;

    const labelsToAdd = [...new Set([...currentLabels, ...labels])];

    this.logger.verbose('checking if labels already exists in conversation');
    if (!labelsToAdd.every((labelAdd) => currentLabels.find((currLabel) => currLabel === labelAdd) !== undefined)) {
      this.logger.verbose(`adding labels to conversation: ${labelsToAdd}`);
      await client.conversationLabels.add({
        accountId: parseInt(provider.account_id),
        conversationId: conversation,
        data: {
          labels: labelsToAdd,
        },
      });

      return labelsToAdd;
    }

    return [];
  }

  public async addLabelsWhatsapp(instance: InstanceDto, remoteJid: string, labels: string[]) {
    const waInstance = this.waMonitor.waInstances[instance.instanceName];

    if (!waInstance) {
      this.logger.warn('wa instance not found');
      return null;
    }

    const labelsToAdd = await this.repository.labels.find({
      where: {
        owner: instance.instanceName,
        name: {
          $in: labels,
        },
      },
    } as any);

    labelsToAdd.forEach((label) => {
      waInstance.client.addChatLabel(remoteJid, label.id);
    });
  }

  public async removeLabels(
    client: ChatwootClient,
    provider: ChatwootRaw,
    instance: InstanceDto,
    conversation: number,
    labels: string[],
  ) {
    const currentLabels: string[] = (
      await client.conversationLabels.list({
        accountId: parseInt(provider.account_id),
        conversationId: conversation,
      })
    ).payload;

    const labelsToKeep = currentLabels.filter((label) => !labels.includes(label));

    this.logger.verbose(`removing labels from conversation`);
    await client.conversationLabels.add({
      accountId: parseInt(provider.account_id),
      conversationId: conversation,
      data: {
        labels: labelsToKeep,
      },
    });

    return labelsToKeep;
  }

  public async labelEditWhatsapp(provider: ChatwootRaw, instance: InstanceDto, label: Label) {
    if (!provider.sync_label) {
      return;
    }

    const pgClient = postgresClient.getChatwootConnection();
    if (label.deleted) {
      return;
    }

    label.name = label.name.trim();

    const labelRepository = (
      await this.repository.labels.find({
        where: {
          id: label.id,
          owner: instance.instanceName,
        },
      })
    )[0];

    if (labelRepository?.chatwootId) {
      const sql = `UPDATE labels SET title = $1, color = $2
                   WHERE id = $3`;
      await pgClient.query(sql, [label.name, this.getLabelChatwootColor(label.color), labelRepository.chatwootId]);
    } else {
      const sql = `WITH new_label AS (
                     INSERT INTO labels (title, color, account_id, created_at, updated_at)
                     VALUES ($1, $2, $3, NOW(), NOW())
                     ON CONFLICT (title, account_id) DO NOTHING
                     RETURNING id
                   )
                   SELECT id FROM new_label 
                   UNION
                   SELECT id FROM labels WHERE title = $1 AND account_id = $3`;
      const labelChatwoot = (
        await pgClient.query(sql, [label.name, this.getLabelChatwootColor(label.color), provider.account_id])
      ).rows[0];
      if (labelChatwoot) {
        this.repository.labels.update(
          [
            {
              ...label,
              chatwootId: labelChatwoot.id,
              owner: instance.instanceName,
            },
          ],
          instance.instanceName,
          true,
        );
      }
    }
  }

  public async labelAssociationWhatsapp(
    client: ChatwootClient,
    provider: ChatwootRaw,
    instance: InstanceDto,
    conversation: conversation,
    labelAssoc: { association: LabelAssociation; type: HandleLabelDto['action'] },
  ) {
    if (!provider.sync_label) {
      return;
    }

    const label = (
      await this.repository.labels.find({
        where: {
          owner: instance.instanceName,
          id: labelAssoc.association.labelId,
        },
      })
    )[0];

    if (label) {
      if (conversation) {
        this.addTempLabel(instance, labelAssoc, label, conversation.id);
        setTimeout(() => {
          this.processTempLabels(client, provider, instance);
        }, 800);
      }
    }
  }

  public addTempLabel(
    instance: InstanceDto,
    labelAssoc: { association: LabelAssociation; type: HandleLabelDto['action'] },
    label: LabelRaw,
    conversationId: number,
  ) {
    const tempLabels = ChatwootLabel.tempLabels.has(instance.instanceName)
      ? ChatwootLabel.tempLabels.get(instance.instanceName)
      : [];
    tempLabels.push({
      type: labelAssoc.type,
      label: label.name,
      conversationId: conversationId,
    });
    ChatwootLabel.tempLabels.set(instance.instanceName, tempLabels);
  }

  public async processTempLabels(client: ChatwootClient, provider: ChatwootRaw, instance: InstanceDto) {
    const labels = ChatwootLabel.tempLabels.get(instance.instanceName);
    ChatwootLabel.tempLabels.delete(instance.instanceName);

    if (!labels) {
      return;
    }

    labels
      .reduce((uniqueConversations, label) => {
        if (!uniqueConversations.includes(label.conversationId)) {
          uniqueConversations.push(label.conversationId);
        }
        return uniqueConversations;
      }, [])
      .forEach(async (conversationId) => {
        await this.addLabels(
          client,
          provider,
          instance,
          conversationId,
          labels
            .filter((label) => label.conversationId === conversationId && label.type === 'add')
            .map((label) => label.label),
        );

        await this.removeLabels(
          client,
          provider,
          instance,
          conversationId,
          labels
            .filter((label) => label.conversationId === conversationId && label.type === 'remove')
            .map((label) => label.label),
        );
      });
  }

  public getLabelChatwootColor(color: number) {
    return [
      '#ec8979',
      '#5bb3e9',
      '#ebc425',
      '#c99dd8',
      '#91abb6',
      '#56ccb4',
      '#fe9dfe',
      '#d3aa1e',
      '#6d7ccf',
      '#d7e751',
      '#01d0e2',
      '#ffc5c7',
      '#92ceac',
      '#f64847',
      '#00a1f2',
      '#83e421',
      '#ffaf04',
      '#b4ebff',
      '#9ba6ff',
      '#9369cf',
    ][color];
  }
}
