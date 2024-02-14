export class LabelDto {
  id?: string;
  name: string;
  color: number;
  predefinedId?: string;
  chatwootId?: number;
}

export class HandleLabelDto {
  number: string;
  labelId: string;
  action: 'add' | 'remove';
}
