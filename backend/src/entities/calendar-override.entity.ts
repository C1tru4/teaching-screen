// 功能：日历调休配置实体。
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('calendar_override')
export class CalendarOverrideEntity {
  @PrimaryColumn({ type: 'text' })
  date!: string; // YYYY-MM-DD

  @Column({ type: 'text' })
  type!: 'work' | 'off';
}
