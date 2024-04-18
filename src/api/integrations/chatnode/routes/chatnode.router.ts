import { RequestHandler, Router } from 'express';

import { HttpStatus } from '../../../../api/routes/index.router';
import { chatnodeController } from '../../../../api/server.module';
import { Logger } from '../../../../config/logger.config';
import { instanceNameSchema } from '../../../../validate/validate.schema';
import { RouterBroker } from '../../../abstract/abstract.router';
import { InstanceDto } from '../../../dto/instance.dto';
import { ChatnodeDto } from '../dto/chatnode.dto';
import { chatnodeSchema } from '../validate/chatnode.schema';

export class ChatnodeRouter extends RouterBroker {
  private readonly logger = new Logger(ChatnodeRouter.name);

  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post(this.routerPath('set'), ...guards, async (req, res) => {
        this.logger.verbose('request received in setChatnode');
        this.logger.verbose('request body: ');
        this.logger.verbose(req.body);

        this.logger.verbose('request query: ');
        this.logger.verbose(req.query);
        const response = await this.dataValidate<ChatnodeDto>({
          request: req,
          schema: chatnodeSchema,
          ClassRef: ChatnodeDto,
          execute: (instance, data) => chatnodeController.createChatnode(instance, data),
        });

        res.status(HttpStatus.CREATED).json(response);
      })
      .get(this.routerPath('find'), ...guards, async (req, res) => {
        this.logger.verbose('request received in findChatnode');
        this.logger.verbose('request body: ');
        this.logger.verbose(req.body);

        this.logger.verbose('request query: ');
        this.logger.verbose(req.query);
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceNameSchema,
          ClassRef: InstanceDto,
          execute: (instance) => chatnodeController.findChatnode(instance),
        });

        res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router = Router();
}
