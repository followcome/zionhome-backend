export class CreateAssetDto {
  assetName: string;
  amount: number;
  currency: 'GBP' | 'USD' | 'NGN';
  purchasedOn: string;
  quantity: number;
  description?: string;
  assignTo?: number;
  image?: string;
  receipt?: string;
}
