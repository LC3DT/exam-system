import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.timestamp).toBeDefined();
      });
  });

  it('/api/auth/login (POST) with missing credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(400);
  });

  it('/api/auth/login (POST) with wrong credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'nonexistent', password: 'wrong' })
      .expect(401);
  });
});
