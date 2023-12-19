import { Schema } from 'mongoose';

import { dbserver } from '../../libs/db.connect';

export class ChatwootRaw {
  _id?: string;
  enabled?: boolean;
  account_id?: string;
  token?: string;
  url?: string;
  name_inbox?: string;
  sign_msg?: boolean;
  sign_delimiter?: string;
  number?: string;
  reopen_conversation?: boolean;
  conversation_pending?: boolean;
  import_contacts?: boolean;
  import_messages?: boolean;
  days_limit_import_messages?: number;
  auto_label?: boolean;
  auto_label_config?: object[];
}

const chatwootSchema = new Schema<ChatwootRaw>({
  _id: { type: String, _id: true },
  enabled: { type: Boolean, required: true },
  account_id: { type: String, required: true },
  token: { type: String, required: true },
  url: { type: String, required: true },
  name_inbox: { type: String, required: true },
  sign_msg: { type: Boolean, required: true },
  sign_delimiter: { type: String, required: false },
  number: { type: String, required: true },
  reopen_conversation: { type: Boolean, required: true },
  conversation_pending: { type: Boolean, required: true },
  import_contacts: { type: Boolean, required: false },
  import_messages: { type: Boolean, required: false },
  days_limit_import_messages: { type: Number, required: false },
  auto_label: { type: Boolean, required: false },
  auto_label_config: { type: [Object], required: false },
});

export const ChatwootModel = dbserver?.model(ChatwootRaw.name, chatwootSchema, 'chatwoot');
export type IChatwootModel = typeof ChatwootModel;
