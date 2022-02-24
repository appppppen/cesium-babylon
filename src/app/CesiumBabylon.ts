import {
    Color3, Color4, Engine, FreeCamera, Matrix, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3, Quaternion
} from '@babylonjs/core/Legacy/legacy';

import {
    ArcGisMapServerImageryProvider, Cartesian3, ShadowMode, UrlTemplateImageryProvider,
    Viewer, WebMapTileServiceImageryProvider, Math as SMath, GeographicTilingScheme, HeadingPitchRoll,
    Transforms, Primitive, GeometryInstance, PolygonHierarchy, PolygonGeometry, EllipsoidSurfaceAppearance, Material, defined, ScreenSpaceEventHandler, ScreenSpaceEventType, SceneMode
} from 'cesium';


export class CesiumBabylon {
    minWGS84 = [117.142184, 31.869697];
    maxWGS84 = [117.357015, 31.713898];
    ThreeContainer = document.getElementById('ThreeContainer') as HTMLCanvasElement;


    viewer: Viewer;
    center = new Cartesian3();
    base_point: any;
    base_point_up: any;
    root_node: any;
    engine: any;
    scene: any;
    camera: any;
    renderer: any;

    main() {
        const cesiumContainer = document.getElementById('cesiumContainer') as HTMLDivElement;
        this.ThreeContainer = document.getElementById('canvas') as HTMLCanvasElement;

        this.initCesium(cesiumContainer);
        this.initBabylon();
        this.initCesiumObject();
        this.loop();
    }

    initCesium(cesiumContainer: HTMLDivElement) {
        const esri = new ArcGisMapServerImageryProvider({ url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer' });
        const googlemap = new UrlTemplateImageryProvider({ url: 'http://mt1.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&{x}&y={y}&z={z}&s=Gali' });

        this.viewer = new Viewer(cesiumContainer, {
            useDefaultRenderLoop: false,
            selectionIndicator: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            navigationInstructionsInitiallyVisible: false,
            contextOptions: {
                webgl: {
                    alpha: false,
                    antialias: true,
                    preserveDrawingBuffer: true,
                    failIfMajorPerformanceCaveat: false,
                    depth: true,
                    stencil: false,
                    anialias: false
                }
            },
            targetFrameRate: 60,
            orderIndependentTranslucency: true,
            imageryProvider: esri, // 谷歌地图
            baseLayerPicker: true,
            geocoder: false,
            automaticallyTrackDataSourceClocks: false,
            dataSources: undefined,
            terrainShadows: ShadowMode.DISABLED,
        });
        const tiandituServer = 'http://{s}.tianditu.gov.cn/cva_c/wmts?service=wmts&request=GetTile&version=1.0.0' +
            '&LAYER=cva&tileMatrixSet=c&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}' +
            '&style=default&format=tiles&tk=92839e82c13b0d4108e552d86d889023';
        this.viewer.imageryLayers.addImageryProvider(new WebMapTileServiceImageryProvider({
            url: tiandituServer,
            layer: 'tdtImg_c',
            style: 'default',
            format: 'image/jpeg',
            tileMatrixSetID: 'GoogleMapsCompatible',
            subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
            tilingScheme: new GeographicTilingScheme(),
            tileMatrixLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'],
            maximumLevel: 50,
        }));

        (this.viewer.cesiumWidget.creditContainer as HTMLDivElement).style.display = 'none';
        const lng = (this.minWGS84[0] + this.maxWGS84[0]) / 2;
        const lat = (this.minWGS84[1] + this.maxWGS84[1]) / 2;
        this.center = Cartesian3.fromDegrees(lng, lat, 350);
        this.base_point = this.cart2vec(Cartesian3.fromDegrees(lng, lat));
        this.base_point_up = this.cart2vec(Cartesian3.fromDegrees(lng, lat, 300));
        this.viewer.camera.flyTo({
            destination: this.center,
            orientation: {
                heading: SMath.toRadians(0),
                pitch: SMath.toRadians(-60),
                roll: SMath.toRadians(0)
            },
            duration: 3
        });
    }

    initBabylon() {
        const engine = new Engine(this.ThreeContainer);
        const scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 0);

        const camera = new FreeCamera('camera', new Vector3(0, 0, -10), scene);

        this.root_node = new TransformNode('BaseNode', scene);
        this.root_node.lookAt(this.base_point_up.subtract(this.base_point));
        this.root_node.addRotation(Math.PI / 2, 0, 0);

        const material = new StandardMaterial('Material', scene);
        material.emissiveColor = new Color3(1, 0, 0);
        material.alpha = 0.5;
        const box = MeshBuilder.CreateBox('box', { size: 100 }, scene);
        box.material = material;
        box.parent = this.root_node;

        const ground = MeshBuilder.CreateGround('ground', { width: 1000, height: 1000, }, scene);
        ground.material = material;
        ground.parent = this.root_node;
        this.root_node.position = this.base_point;
        this.engine = engine;
        this.scene = scene;
        this.camera = camera;
    }

    moveBabylonCamera() {
        const fov = SMath.toDegrees((this.viewer.camera.frustum as any).fovy);
        this.camera.fov = (fov / 180) * Math.PI;

        const civm = this.viewer.camera.inverseViewMatrix;
        const camera_matrix = Matrix.FromValues(
            civm[0], civm[1], civm[2], civm[3], civm[4], civm[5], civm[6], civm[7],
            civm[8], civm[9], civm[10], civm[11], civm[12], civm[13], civm[14], civm[15]
        );

        const scaling = Vector3.Zero();
        const rotation = Quaternion.Identity();
        const transform = Vector3.Zero();
        camera_matrix.decompose(scaling, rotation, transform);
        const camera_pos = this.cart2vec(transform);
        const camera_direction = this.cart2vec(this.viewer.camera.direction);
        const camera_up = this.cart2vec(this.viewer.camera.up);

        let rotation_y = Math.atan(camera_direction.z / camera_direction.x);
        if (camera_direction.x < 0) {
            rotation_y += Math.PI;
        }
        rotation_y = Math.PI / 2 - rotation_y;
        const rotation_x = Math.asin(-camera_direction.y);
        const camera_up_before_rotatez = new Vector3(-Math.cos(rotation_y), 0, Math.sin(rotation_y));
        let rotation_z = Math.acos(
            camera_up.x * camera_up_before_rotatez.x + camera_up.y * camera_up_before_rotatez.y + camera_up.z * camera_up_before_rotatez.z
        );
        rotation_z = Math.PI / 2 - rotation_z;
        if (camera_up.y < 0) { rotation_z = Math.PI - rotation_z; }

        this.camera.position.x = camera_pos.x; // - this.base_point.x;
        this.camera.position.y = camera_pos.y; //  - this.base_point.y;
        this.camera.position.z = camera_pos.z; //  - this.base_point.z;
        this.camera.rotation.x = rotation_x;
        this.camera.rotation.y = rotation_y;
        this.camera.rotation.z = rotation_z;
        // console.log(camera_pos);
    }

    initCesiumObject() {
        const position = Cartesian3.fromDegrees(this.minWGS84[0], this.minWGS84[1], 0);
        const heading = SMath.toRadians(135);
        const pitch = 0;
        const roll = 0;
        const hpr = new HeadingPitchRoll(heading, pitch, roll);
        const orientation = Transforms.headingPitchRollQuaternion(position, hpr);

        const entity = this.viewer.entities.add({
            id: 'obj_id_110', position, model: {
                uri: 'https://parse.model.pm.bjocd.com/BIMComposer/model/building/scene.gltf', scale: 1,
            }
        });

        const position1 = Cartesian3.fromDegrees(this.minWGS84[0], this.maxWGS84[1], 0);
        // this.viewer.entities.add({
        //     position: position1,
        //     orientation: orientation,
        //     model: {
        //         uri: 'https://parse.model.pm.bjocd.com/BIMComposer/model/zhongnan.gltf',
        //         // uri: 'https://parse.model.pm.bjocd.com/BIMComposer/model/viewCube.glb',
        //         // minimumPixelSize: 128,
        //         scale: 1000,
        //         // maximumScale: 20000
        //     },
        // });

        const waterPrimitive = new Primitive({
            // show:false,// 默认隐藏
            allowPicking: false,
            geometryInstances: new GeometryInstance({
                geometry: new PolygonGeometry({
                    polygonHierarchy: new PolygonHierarchy(
                        Cartesian3.fromDegreesArray([
                            this.minWGS84[0], this.minWGS84[1],
                            this.maxWGS84[0], this.minWGS84[1],
                            this.maxWGS84[0], this.maxWGS84[1],
                            this.minWGS84[0], this.maxWGS84[1]
                        ])
                    ), // waterFace是一个组成多边形顶点数组[lon,lat,alt]
                    // extrudedHeight: 0,//注释掉此属性可以只显示水面
                    perPositionHeight: true // 注释掉此属性水面就贴地了
                })
            }),
            // 可以设置内置的水面shader
            appearance: new EllipsoidSurfaceAppearance({
                material: new Material({
                    fabric: {
                        type: 'Water',
                        uniforms: {
                            // baseWaterColor:new Color(0.0, 0.0, 1.0, 0.5),
                            // blendColor: new Color(0.0, 0.0, 1.0, 0.5),
                            // specularMap: 'gray.jpg',
                            // normalMap: 'waterNormals.jpg',
                            frequency: 1000.0,
                            animationSpeed: 0.01,
                            amplitude: 10.0
                        }
                    }
                }),
                fragmentShaderSource: `
                varying vec3 v_positionMC;
                varying vec3 v_positionEC;
                varying vec2 v_st;
                void main()
                {
                    czm_materialInput materialInput;
                    vec3 normalEC = normalize(czm_normal3D * czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));
                    #ifdef FACE_FORWARD
                        normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
                    #endif
                        materialInput.s = v_st.s;
                        materialInput.st = v_st;
                        materialInput.str = vec3(v_st, 0.0);
                        materialInput.normalEC = normalEC;
                        materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(v_positionMC, materialInput.normalEC);
                        vec3 positionToEyeEC = -v_positionEC;
                        materialInput.positionToEyeEC = positionToEyeEC;
                        czm_material material = czm_getMaterial(materialInput);
                    // #ifdef FLAT
                        gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
                    // #else
                        // gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
                        // gl_FragColor.a=0.5;
                    // #endif
}
` // 重写shader，修改水面的透明度
            })
        });
        this.viewer.scene.primitives.add(waterPrimitive);
        // this.viewer.scene.primitives.add(entity);



        var handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        handler.setInputAction((movement) => {
            var pick = this.viewer.scene.pick(movement.position);
            if (defined(pick) && (pick.id.id === 'obj_id_110')) {
                console.log("left click");
            }
        }, ScreenSpaceEventType.LEFT_CLICK);

        // 鼠标移入labelEntity提示框
        handler.setInputAction((movement) => {
            if (this.viewer.scene.mode !== SceneMode.MORPHING) {
                var pickedObject = this.viewer.scene.pick(movement.endPosition);
                if (defined(pickedObject) && (pickedObject.id.id === 'obj_id_110')) {
                    console.log("mouse move");
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);
    }

    cart2vec(cart: any) {
        return new Vector3(cart.x, cart.z, cart.y);
    }

    loop() {
        this.engine.runRenderLoop(() => {
            this.viewer.render();
            this.moveBabylonCamera();
            this.scene.render();
        });
    }

}

