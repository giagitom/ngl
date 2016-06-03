/**
 * @file Ball And Stick Representation
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */


import { defaults } from "../utils.js";
import { ExtensionFragDepth, RepresentationRegistry } from "../globals.js";
import { calculateCenterArray } from "../math/array-utils.js";
import StructureRepresentation from "./structure-representation.js";
import SphereBuffer from "../buffer/sphere-buffer.js";
import CylinderBuffer from "../buffer/cylinder-buffer.js";
import LineBuffer from "../buffer/line-buffer.js";


function BallAndStickRepresentation( structure, viewer, params ){

    StructureRepresentation.call( this, structure, viewer, params );

}

BallAndStickRepresentation.prototype = Object.assign( Object.create(

    StructureRepresentation.prototype ), {

    constructor: BallAndStickRepresentation,

    type: "ball+stick",

    defaultSize: 0.15,

    parameters: Object.assign( {

        sphereDetail: {
            type: "integer", max: 3, min: 0, rebuild: "impostor"
        },
        radiusSegments: {
            type: "integer", max: 25, min: 5, rebuild: "impostor"
        },
        disableImpostor: {
            type: "boolean", rebuild: true
        },
        aspectRatio: {
            type: "number", precision: 1, max: 10.0, min: 1.0
        },
        lineOnly: {
            type: "boolean", rebuild: true
        },
        cylinderOnly: {
            type: "boolean", rebuild: true
        }

    }, StructureRepresentation.prototype.parameters ),

    init: function( params ){

        var p = params || {};
        p.radius = defaults( p.radius, this.defaultSize );

        if( p.quality === "low" ){
            this.sphereDetail = 0;
            this.radiusSegments = 5;
        }else if( p.quality === "medium" ){
            this.sphereDetail = 1;
            this.radiusSegments = 10;
        }else if( p.quality === "high" ){
            this.sphereDetail = 2;
            this.radiusSegments = 20;
        }else{
            this.sphereDetail = defaults( p.sphereDetail, 1 );
            this.radiusSegments = defaults( p.radiusSegments, 10 );
        }
        this.disableImpostor = defaults( p.disableImpostor, false );

        this.aspectRatio = defaults( p.aspectRatio, 2.0 );
        this.lineOnly = defaults( p.lineOnly, false );
        this.cylinderOnly = defaults( p.cylinderOnly, false );

        StructureRepresentation.prototype.init.call( this, p );

    },

    getAtomParams: function( what, params ){

        params = Object.assign( {
            radiusParams: { "radius": this.radius, "scale": this.scale * this.aspectRatio }
        }, params );

        return StructureRepresentation.prototype.getAtomParams.call( this, what, params );

    },

    getAtomData: function( sview, what, params ){

        return sview.getAtomData( this.getAtomParams( what, params ) );

    },

    getBondData: function( sview, what, params ){

        return sview.getBondData( this.getBondParams( what, params ) );

    },

    createData: function( sview ){

        var bondData = this.getBondData( sview );
        var bufferList = [];

        if( this.lineOnly ){

            this.lineBuffer = new LineBuffer(
                bondData.position1,
                bondData.position2,
                bondData.color1,
                bondData.color2,
                this.getBufferParams()
            );

            bufferList.push( this.lineBuffer );

        }else{

            if( !this.cylinderOnly ){

                var atomData = this.getAtomData( sview );

                var sphereBuffer = new SphereBuffer(
                    atomData.position,
                    atomData.color,
                    atomData.radius,
                    atomData.pickingColor,
                    this.getBufferParams( {
                        sphereDetail: this.sphereDetail,
                        disableImpostor: this.disableImpostor,
                        dullInterior: true
                    } )
                );

                bufferList.push( sphereBuffer );

            }

            var cylinderBuffer = new CylinderBuffer(
                bondData.position1,
                bondData.position2,
                bondData.color1,
                bondData.color2,
                bondData.radius,
                bondData.pickingColor1,
                bondData.pickingColor2,
                this.getBufferParams( {
                    shift: 0,
                    cap: true,
                    radiusSegments: this.radiusSegments,
                    disableImpostor: this.disableImpostor,
                    dullInterior: true
                } )
            );

            bufferList.push( cylinderBuffer );

        }

        return {
            bufferList: bufferList
        };

    },

    updateData: function( what, data ){

        var bondData = this.getBondData( data.sview, what );

        if( this.lineOnly ){

            var lineData = {};

            if( !what || what.position ){
                lineData.from = bondData.position1;
                lineData.to = bondData.position2;
            }

            if( !what || what.color ){
                lineData.color = bondData.color1;
                lineData.color2 = bondData.color2;
            }

            data.bufferList[ 0 ].setAttributes( lineData );

        }else{

            var atomData = this.getAtomData( data.sview, what );
            var sphereData = {};
            var cylinderData = {};

            if( !what || what.position ){
                sphereData.position = atomData.position;
                cylinderData.position = calculateCenterArray(
                    bondData.position1, bondData.position2
                );
                cylinderData.position1 = bondData.position1;
                cylinderData.position2 = bondData.position2;
            }

            if( !what || what.color ){
                sphereData.color = atomData.color;
                cylinderData.color = bondData.color1;
                cylinderData.color2 = bondData.color2;
            }

            if( !what || what.radius ){
                sphereData.radius = atomData.radius;
                cylinderData.radius = bondData.radius;
            }

            data.bufferList[ 0 ].setAttributes( sphereData );
            data.bufferList[ 1 ].setAttributes( cylinderData );

        }

    },

    setParameters: function( params ){

        var rebuild = false;
        var what = {};

        if( params && params.aspectRatio ){

            what.radius = true;
            if( !ExtensionFragDepth || this.disableImpostor ){
                rebuild = true;
            }

        }

        StructureRepresentation.prototype.setParameters.call(
            this, params, what, rebuild
        );

        return this;

    }

} );


RepresentationRegistry.add( "ball+stick", BallAndStickRepresentation );


export default BallAndStickRepresentation;