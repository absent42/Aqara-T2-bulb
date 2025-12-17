import * as exposes from "zigbee-herdsman-converters/lib/exposes";
import * as lumi from "zigbee-herdsman-converters/lib/lumi";
import * as m from "zigbee-herdsman-converters/lib/modernExtend";

const {lumiModernExtend, manufacturerCode} = lumi;
const ea = exposes.access;

// ============================================================================
// SHARED COLOR CONVERSION FUNCTIONS (identical across T1M, T1 Strip, T2)
// ============================================================================

function rgbToXY(r, g, b) {
    let red = r / 255.0;
    let green = g / 255.0;
    let blue = b / 255.0;

    red = red > 0.04045 ? ((red + 0.055) / 1.055) ** 2.4 : red / 12.92;
    green = green > 0.04045 ? ((green + 0.055) / 1.055) ** 2.4 : green / 12.92;
    blue = blue > 0.04045 ? ((blue + 0.055) / 1.055) ** 2.4 : blue / 12.92;

    const X = red * 0.4124564 + green * 0.3575761 + blue * 0.1804375;
    const Y = red * 0.2126729 + green * 0.7151522 + blue * 0.0721750;
    const Z = red * 0.0193339 + green * 0.1191920 + blue * 0.9503041;

    const sum = X + Y + Z;
    if (sum === 0) {
        return {x: 0, y: 0};
    }

    return {
        x: X / sum,
        y: Y / sum,
    };
}

function encodeColor(color) {
    if (typeof color !== 'object' || color.r === undefined || color.g === undefined || color.b === undefined) {
        throw new Error(`Invalid color format. Expected {r: 0-255, g: 0-255, b: 0-255}, got: ${JSON.stringify(color)}`);
    }

    const r = Number(color.r);
    const g = Number(color.g);
    const b = Number(color.b);

    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        throw new Error(`RGB values must be between 0-255. Got r:${r}, g:${g}, b:${b}`);
    }

    const xy = rgbToXY(r, g, b);

    const xScaled = Math.round(xy.x * 65535);
    const yScaled = Math.round(xy.y * 65535);

    return [
        (xScaled >>> 8) & 0xff,
        xScaled & 0xff,
        (yScaled >>> 8) & 0xff,
        yScaled & 0xff,
    ];
}

// ============================================================================
// MODERN EXTEND: EFFECT COLORS
// ============================================================================

function lumiEffectColors() {
    return {
        isModernExtend: true,
        toZigbee: [
            {
                key: ["effect_colors"],
                convertSet: async (entity, key, value, meta) => {
                    const colors = value || meta.state.effect_colors || [{r: 255, g: 0, b: 0}, {r: 0, g: 255, b: 0}, {r: 0, g: 0, b: 255}];

                    if (!Array.isArray(colors) || colors.length < 1 || colors.length > 8) {
                        throw new Error("Must provide array of 1-8 RGB color objects");
                    }

                    const colorBytes = [];
                    for (const color of colors) {
                        const encoded = encodeColor(color);
                        colorBytes.push(...encoded);
                    }

                    const packet = Buffer.from([0x00, colors.length, ...colorBytes]);
                    const targetEndpoint = meta.device.getEndpoint(1);

                    await targetEndpoint.write(
                        "manuSpecificLumi",
                        {1315: {value: packet, type: 0x41}},
                        {manufacturerCode, disableDefaultResponse: false},
                    );

                    return {
                        state: {
                            effect_colors: colors,
                        },
                    };
                },
            },
        ],
        exposes: [
            exposes
                .list("effect_colors", ea.SET, exposes.composite("color", "color", ea.SET)
                    .withFeature(exposes.numeric("r", ea.SET).withValueMin(0).withValueMax(255).withDescription("Red (0-255)"))
                    .withFeature(exposes.numeric("g", ea.SET).withValueMin(0).withValueMax(255).withDescription("Green (0-255)"))
                    .withFeature(exposes.numeric("b", ea.SET).withValueMin(0).withValueMax(255).withDescription("Blue (0-255)")))
                .withDescription("Array of RGB color objects for dynamic effects (1-8 colors).")
                .withLengthMin(1)
                .withLengthMax(8)
                .withCategory("config"),
        ],
        fromZigbee: [],
        meta: {},
    };
}

export default {
    zigbeeModel: ["lumi.light.agl001", "lumi.light.agl003", "lumi.light.agl005", "lumi.light.agl007"],
    model: "T2_E27",
    vendor: "Aqara",
    description: "E27 led bulb",
    whiteLabel: [
        {
            model: "T2_GU10",
            vendor: "Aqara",
            description: "GU10 led bulb",
            fingerprint: [{modelID: "lumi.light.agl005"}, {modelID: "lumi.light.agl007"}],
        },
        {
            model: "T2_E26",
            vendor: "Aqara",
            description: "E26 led bulb",
            fingerprint: [{modelID: "lumi.light.agl001"}],
        },
    ],

    configure: async (device, coordinatorEndpoint) => {
        const endpoint = device.getEndpoint(1);
        await endpoint.read("manuSpecificLumi", [0x0515], {manufacturerCode: manufacturerCode});
        await endpoint.read("manuSpecificLumi", [0x0516], {manufacturerCode: manufacturerCode});
        await endpoint.read("manuSpecificLumi", [0x0528], {manufacturerCode: manufacturerCode});
        await endpoint.read("manuSpecificLumi", [0x052c], {manufacturerCode: manufacturerCode});
        await endpoint.read("genLevelCtrl", [0x0012], {});
        await endpoint.read("genLevelCtrl", [0x0013], {});
    },

    extend: [
        lumiModernExtend.lumiLight({
            colorTemp: true,
            color: true,
            colorTempRange: [111, 500],
        }),

        m.identify(),
        lumiModernExtend.lumiPowerOnBehavior({lookup: {off: 0, on: 1, reverse: 2, restore: 3}}),
        m.forcePowerSource({powerSource: "Mains (single phase)"}),
        lumiModernExtend.lumiZigbeeOTA(),

        lumiModernExtend.lumiDimmingRangeMin(),
        lumiModernExtend.lumiDimmingRangeMax(),
        lumiModernExtend.lumiOnOffDuration(),
        lumiModernExtend.lumiOffOnDuration(),
        lumiModernExtend.lumiTransitionCurveCurvature(),
        lumiModernExtend.lumiTransitionInitialBrightness(),

        m.enumLookup({
            name: "effect",
            lookup: {off: 0, breathing: 1, candlelight: 2, fading: 3, flash: 4},
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x051f, type: 0x23},
            description: "RGB dynamic effect type for LED bulb",
            zigbeeCommandOptions: {manufacturerCode},
        }),

        m.numeric({
            name: "effect_speed",
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x0520, type: 0x20},
            description: "RGB dynamic effect speed (1-100%)",
            zigbeeCommandOptions: {manufacturerCode},
            unit: "%",
            valueMin: 1,
            valueMax: 100,
            valueStep: 1,
        }),

        lumiEffectColors(),
    ],
};
