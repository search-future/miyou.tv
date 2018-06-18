/*!
Copyright 2016-2018 Brazil Ltd.

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
import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { WindowService } from './window.service';

@Component({
  selector: 'quit-modal',
  templateUrl: 'quit-modal.component.html',
})
export class QuitModalComponent {
  public form: FormGroup = new FormGroup({});

  constructor(
    private bsModalRef: BsModalRef,
    private windowService: WindowService,
  ) { }

  public submit() {
    this.windowService.quit();
  }

  public close() {
    this.bsModalRef.hide();
  }
}
