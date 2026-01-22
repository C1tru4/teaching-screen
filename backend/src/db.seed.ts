// 功能：应用启动时的种子数据初始化。
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabEntity } from './entities/lab.entity';
import { BannerEntity } from './entities/banner.entity';
import { ConfigKVEntity } from './entities/config-kv.entity';

@Injectable()
export class DbSeed implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(LabEntity) private labsRepo: Repository<LabEntity>,
    @InjectRepository(BannerEntity) private banRepo: Repository<BannerEntity>,
    @InjectRepository(ConfigKVEntity) private cfgRepo: Repository<ConfigKVEntity>
  ) {}
  async onApplicationBootstrap() {
    // 实验室
    const labs = await this.labsRepo.count();
    if (labs === 0) {
      await this.labsRepo.save([
        { id:1, name:'西116', capacity:40 },
        { id:2, name:'西108', capacity:36 },
        { id:3, name:'西106', capacity:32 },
        { id:4, name:'西102', capacity:30 },
        { id:5, name:'东131', capacity:28 },
      ]);
    }
    // 学期起始默认值
    const sem = await this.cfgRepo.findOneBy({ k: 'semesterStartMondayISO' });
    if (!sem) await this.cfgRepo.save({ k: 'semesterStartMondayISO', v: '2025-09-01' });

    // 默认 banner（可见 & 不过期）
    const b = await this.banRepo.findOneBy({ id:1 });
    if (!b) {
      await this.banRepo.save({
        id:1, content:'实验成果可视化展示', level:'info', expiresAt:'2099-12-31T23:59:59+08:00', visible:1, scrollable:0, scrollTime:15
      });
    } else {
      // 如果横幅存在但内容不是我们想要的，更新它
      if (b.content !== '实验成果可视化展示') {
        await this.banRepo.update({ id: 1 }, {
          content: '实验成果可视化展示',
          level: 'info',
          expiresAt: '2099-12-31T23:59:59+08:00',
          visible: 1,
          scrollable: 0,
          scrollTime: 15
        });
      }
    }
  }
}
