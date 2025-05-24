import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { UserDepartmentProviders } from './user-department-adapter';
import { UserDepartmentHttpController } from './user-department-http.controller';
import { DepartmentModule } from '../department/department.module';

@Module({
  imports: [ShareModule, DepartmentModule],
  controllers: [UserDepartmentHttpController],
  providers: [...UserDepartmentProviders],
  exports: [...UserDepartmentProviders],
})
export class UserDepartmentModule {}
