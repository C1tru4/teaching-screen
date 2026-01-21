import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataManager } from './utils/dataManager';

import { ProjectEntity } from './entities/project.entity';
import { LabEntity } from './entities/lab.entity';
import { SessionEntity } from './entities/session.entity';
import { BannerEntity } from './entities/banner.entity';
import { ConfigKVEntity } from './entities/config-kv.entity';
import { CalendarOverrideEntity } from './entities/calendar-override.entity';
import { ClassEntity } from './entities/class.entity';

import { ProjectsService } from './projects.service';
import { LabsService } from './labs.service';
import { ConfigService } from './config.service';
import { AnnouncementService } from './announcement.service';
import { RenderService } from './render.service';
import { ClassService } from './class.service';
import { DbSeed } from './db.seed';

import { ProjectsController } from './projects.controller';
import { LabsController } from './labs.controller';
import { ConfigController } from './config.controller';
import { AnnouncementController } from './announcement.controller';
import { RenderController } from './render.controller';
import { LabScheduleController } from './lab-schedule.controller';
import { ClassController } from './class.controller';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const dataManager = DataManager.getInstance();
        return {
          type: 'sqlite',
          database: process.env.DB_FILE || dataManager.getDatabasePath(),
          entities: [
            ProjectEntity,
            LabEntity,
            SessionEntity,
            BannerEntity,
            ConfigKVEntity,
            CalendarOverrideEntity,
            ClassEntity
          ],
          // 开发 true；生产 false
          synchronize: process.env.NODE_ENV !== 'production',
          logging: process.env.TYPEORM_LOGGING === 'true'
        };
      }
    }),
    TypeOrmModule.forFeature([
      ProjectEntity,
      LabEntity,
      SessionEntity,
      BannerEntity,
      ConfigKVEntity,
      CalendarOverrideEntity,
      ClassEntity
    ])
  ],
  controllers: [
    ProjectsController,
    LabsController,
    ConfigController,
    AnnouncementController,
    RenderController,
    LabScheduleController,
    ClassController
  ],
  providers: [
    ProjectsService,
    LabsService,
    ConfigService,
    AnnouncementService,
    RenderService,
    ClassService,
    DbSeed
  ]
})
export class AppModule {}
