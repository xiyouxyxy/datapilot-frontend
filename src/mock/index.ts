import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { userMock } from './users';
import { employeeMock } from './employees';
import { dashboardMock } from './dashboard';
import { workflowMock } from './workflow';
import { messageMock } from './message';
import { ssoMock } from './sso';

// 在请求层被调用：用 axios-mock-adapter 拦截实例上的所有请求，业务代码无感知。
export function setupMock(instance: AxiosInstance) {
  const mock = new MockAdapter(instance, { delayResponse: 350 });
  userMock(mock);
  employeeMock(mock);
  dashboardMock(mock);
  workflowMock(mock);
  messageMock(mock);
  ssoMock(mock);
}
