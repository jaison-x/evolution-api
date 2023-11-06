export type ActiveHoursConfig = {
  ini: string;
  end: string;
};

export class ChatnodeDto {
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
}
