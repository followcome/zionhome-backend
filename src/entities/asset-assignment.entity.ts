import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { User } from './user.entity';

@Entity('asset_assignments')
export class AssetAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assetId: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  @CreateDateColumn({ type: 'timestamp' })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date | null;
}
