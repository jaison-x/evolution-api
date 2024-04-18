import { Schema } from 'mongoose';

import { dbserver } from '../../libs/db.connect';
import { ActiveHoursConfig } from '../dto/chatnode.dto';

export class ChatnodeRaw {
  _id?: string;
  enabled?: boolean;
  bot_id?: string;
  sign_name?: string;
  active_hours?: {
    0: ActiveHoursConfig[];
    1: ActiveHoursConfig[];
    2: ActiveHoursConfig[];
    3: ActiveHoursConfig[];
    4: ActiveHoursConfig[];
    5: ActiveHoursConfig[];
    6: ActiveHoursConfig[];
  };
  numbers_always_active?: string[];
  //process_messages_in_inactive_hours?: boolean;
  //process_messages_in_inactive_hours_after?: number;
}

const chatnodeSchema = new Schema<ChatnodeRaw>({
  _id: { type: String, _id: true },
  enabled: { type: Boolean, required: false },
  bot_id: { type: String, required: false },
  sign_name: { type: String, required: false },
  active_hours: { type: {}, required: false },
  numbers_always_active: { type: [String], required: false },
  //process_messages_in_inactive_hours: { type: Boolean, required: false },
  //process_messages_in_inactive_hours_after: { type: Number, required: false },
});

export const ChatnodeModel = dbserver?.model(ChatnodeRaw.name, chatnodeSchema, 'chatnode');
export type IChatnodeModel = typeof ChatnodeModel;
