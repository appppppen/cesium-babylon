import { AfterViewInit, Component } from '@angular/core';
import { CesiumBabylon } from './CesiumBabylon';

@Component({
    selector: 'app-root',
    template: `<div id="cesiumContainer"></div>
    <div style="width: 100%;height: 100%;
    position: absolute;
    left: 0;
    top: 0;pointer-events: none;"><canvas id="canvas"></canvas></div>
    `
})
export class AppComponent implements AfterViewInit {
    cesiumBabylon: CesiumBabylon;
    constructor(

    ) {
        this.cesiumBabylon = new CesiumBabylon();
    }

    ngAfterViewInit(): void {
        this.cesiumBabylon.main();
    }
}
