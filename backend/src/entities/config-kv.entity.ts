import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('config_kv')
export class ConfigKVEntity {
  @PrimaryColumn({ type: 'text' })
  k!: string;

  @Column({ type: 'text' })
  v!: string;
}
