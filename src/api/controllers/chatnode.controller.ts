import { Logger } from '../../config/logger.config';
import { ChatnodeDto } from '../dto/chatnode.dto';
import { InstanceDto } from '../dto/instance.dto';
import { ChatnodeService } from '../services/chatnode.service';

export class ChatnodeController {
  constructor(private readonly chatnodeService: ChatnodeService) {}

  private readonly logger = new Logger(ChatnodeController.name);

  public async createChatnode(instance: InstanceDto, data: ChatnodeDto) {
    this.logger.verbose('requested createChatnode from ' + instance.instanceName + ' instance');

    return this.chatnodeService.create(instance, data);
  }

  public async findChatnode(instance: InstanceDto) {
    this.logger.verbose('requested findChatnode from ' + instance.instanceName + ' instance');
    return this.chatnodeService.find(instance);
  }
}
