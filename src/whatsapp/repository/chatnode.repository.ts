import { readFileSync } from 'fs';
import { join } from 'path';

import { ConfigService } from '../../config/env.config';
import { Logger } from '../../config/logger.config';
import { IInsert, Repository } from '../abstract/abstract.repository';
import { ChatnodeRaw, IChatnodeModel } from '../models/chatnode.model';

export class ChatnodeRepository extends Repository {
  constructor(private readonly chatnodeModel: IChatnodeModel, private readonly configService: ConfigService) {
    super(configService);
  }

  private readonly logger = new Logger(ChatnodeRepository.name);

  public async create(data: ChatnodeRaw, instance: string): Promise<IInsert> {
    try {
      this.logger.verbose('creating chatnode');
      if (this.dbSettings.ENABLED) {
        this.logger.verbose('saving chatnode to db');
        const insert = await this.chatnodeModel.replaceOne({ _id: instance }, { ...data }, { upsert: true });

        this.logger.verbose('chatnode saved to db: ' + insert.modifiedCount + ' chatnode');
        return { insertCount: insert.modifiedCount };
      }

      this.logger.verbose('saving chatnode to store');

      this.writeStore<ChatnodeRaw>({
        path: join(this.storePath, 'chatnode'),
        fileName: instance,
        data,
      });

      this.logger.verbose('chatnode saved to store in path: ' + join(this.storePath, 'chatnode') + '/' + instance);

      this.logger.verbose('chatnode created');
      return { insertCount: 1 };
    } catch (error) {
      return error;
    }
  }

  public async find(instance: string): Promise<ChatnodeRaw> {
    try {
      this.logger.verbose('finding chatnode');
      if (this.dbSettings.ENABLED) {
        this.logger.verbose('finding chatnode in db');
        return await this.chatnodeModel.findOne({ _id: instance });
      }

      this.logger.verbose('finding chatnode in store');
      return JSON.parse(
        readFileSync(join(this.storePath, 'chatnode', instance + '.json'), {
          encoding: 'utf-8',
        }),
      ) as ChatnodeRaw;
    } catch (error) {
      return {};
    }
  }
}
