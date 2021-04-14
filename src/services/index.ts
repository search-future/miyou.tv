/*!
Copyright 2016-2021 Brazil Ltd.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import BackendService from "./BackendService";
import CommentService from "./CommentService";
import ChinachuService from "./ChinachuService";
import GaraponService from "./GaraponService";
import GaraponV4Service from "./GaraponV4Service";
import EPGStationService from "./EPGStationService";
import MirakcTimeshiftService from "./MirakcTimeshiftService";

import { garaponDevId } from "../config/constants";

let backendService: BackendService | null;
export async function initBackendService({ type, ...options }: any) {
  try {
    switch (type) {
      case "epgstation":
        backendService = new EPGStationService(options);
        break;
      case "mirakc":
        backendService = new MirakcTimeshiftService(options);
        break;
      case "garapon":
        GaraponService.devId = garaponDevId || "";
        backendService = new GaraponService(options);
        break;
      case "garaponv4":
        GaraponV4Service.devId = garaponDevId || "";
        backendService = new GaraponV4Service(options);
        break;
      case "chinachu":
      default: {
        backendService = new ChinachuService(options);
      }
    }
    await backendService.init();
    return backendService;
  } catch (e) {
    backendService = null;
    throw e;
  }
}
export async function getBackendService(options: any = {}) {
  if (backendService) {
    return backendService;
  }
  return initBackendService(options);
}

let commentService: CommentService | null;
export async function initCommentService(options: any) {
  try {
    commentService = new CommentService(options);
    await commentService.init();
    return commentService;
  } catch (e) {
    commentService = null;
    throw e;
  }
}
export async function getCommentService(options: any = {}) {
  if (commentService) {
    return commentService;
  }
  return initCommentService(options);
}
