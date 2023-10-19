export class ChatwootDto {
  enabled?: boolean;
  account_id?: string;
  token?: string;
  url?: string;
  name_inbox?: string;
  sign_msg?: boolean;
  number?: string;
  reopen_conversation?: boolean;
  conversation_pending?: boolean;
  import_contacts?: boolean;
  import_messages?: boolean;
  days_limit_import_messages?: number;
}
