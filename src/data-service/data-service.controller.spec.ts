import { Test, TestingModule } from '@nestjs/testing';
import { DataServiceController } from './data-service.controller';

describe('DataServiceController', () => {
  let controller: DataServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataServiceController],
    }).compile();

    controller = module.get<DataServiceController>(DataServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
