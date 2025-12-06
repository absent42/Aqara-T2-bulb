import * as exposes from "zigbee-herdsman-converters/lib/exposes";
import * as lumi from "zigbee-herdsman-converters/lib/lumi";
import * as m from "zigbee-herdsman-converters/lib/modernExtend";

const {lumiModernExtend, manufacturerCode} = lumi;
const ea = exposes.access;

// ============================================================================
// SHARED COLOR CONVERSION FUNCTIONS (identical across T1M, T1 Strip, T2)
// ============================================================================

// Convert RGB to XY
function rgbToXY(r, g, b) {
    // Normalize RGB to 0-1
    let red = r / 255.0;
    let green = g / 255.0;
    let blue = b / 255.0;

    // Apply gamma correction (sRGB)
    red = red > 0.04045 ? ((red + 0.055) / 1.055) ** 2.4 : red / 12.92;
    green = green > 0.04045 ? ((green + 0.055) / 1.055) ** 2.4 : green / 12.92;
    blue = blue > 0.04045 ? ((blue + 0.055) / 1.055) ** 2.4 : blue / 12.92;

    // Convert to XYZ using sRGB D65 conversion matrix
    const X = red * 0.4124564 + green * 0.3575761 + blue * 0.1804375;
    const Y = red * 0.2126729 + green * 0.7151522 + blue * 0.072175;
    const Z = red * 0.0193339 + green * 0.119192 + blue * 0.9503041;

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
    // Validate RGB object
    if (typeof color !== 'object' || color.r === undefined || color.g === undefined || color.b === undefined) {
        throw new Error(`Invalid color format. Expected {r: 0-255, g: 0-255, b: 0-255}, got: ${JSON.stringify(color)}`);
    }

    const r = Number(color.r);
    const g = Number(color.g);
    const b = Number(color.b);

    // Validate ranges
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        throw new Error(`RGB values must be between 0-255. Got r:${r}, g:${g}, b:${b}`);
    }

    // Convert RGB to XY
    const xy = rgbToXY(r, g, b);

    // Scale to 16-bit integers
    const xScaled = Math.round(xy.x * 65535);
    const yScaled = Math.round(xy.y * 65535);

    // Pack into 4 bytes (big endian): [x_high, x_low, y_high, y_low]
    return [
        (xScaled >>> 8) & 0xff, // x_high
        xScaled & 0xff, // x_low
        (yScaled >>> 8) & 0xff, // y_high
        yScaled & 0xff, // y_low
    ];
}

function getDeviceType(meta) {
    const model = meta.device.modelID;
    // T1M: lumi.light.acn032, lumi.light.acn031
    // T1 Strip: lumi.light.acn132
    return model === "lumi.light.acn132" ? "strip" : "t1m";
}

// ============================================================================
// END SHARED COLOR CONVERSION FUNCTIONS
// ============================================================================

export default {
    zigbeeModel: ["lumi.light.agl003", "lumi.light.agl005", "lumi.light.agl006", "lumi.light.agl001", "lumi.light.agl002"],
    model: "T2_E27",
    vendor: "Aqara",
    description: "E27 led bulb",
    whiteLabel: [
        {
            model: "T2_GU10",
            vendor: "Aqara",
            description: "GU10 led bulb",
            fingerprint: [{modelID: "lumi.light.agl005"}, {modelID: "lumi.light.agl006"}],
        },
        {
            model: "T2_E26",
            vendor: "Aqara",
            description: "E26 led bulb",
            fingerprint: [{modelID: "lumi.light.agl001"}, {modelID: "lumi.light.agl002"}],
        },
    ],

    configure: async (device, coordinatorEndpoint) => {
        const endpoint = device.getEndpoint(1);
        await endpoint.read("manuSpecificLumi", [0x0515], {manufacturerCode: manufacturerCode}); // Read dimming_range_minimum
        await endpoint.read("manuSpecificLumi", [0x0516], {manufacturerCode: manufacturerCode}); // Read dimming_range_maximum
        await endpoint.read("manuSpecificLumi", [0x0528], {manufacturerCode: manufacturerCode}); // Read transition_curve_curvature
        await endpoint.read("manuSpecificLumi", [0x052c], {manufacturerCode: manufacturerCode}); // Read transition_initial_brightness
        await endpoint.read("genLevelCtrl", [0x0012], {}); // off_on_duration
        await endpoint.read("genLevelCtrl", [0x0013], {}); // on_off_duration
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

        // RGB Effect Type - T2 specific mappings
        m.enumLookup({
            name: "rgb_effect",
            lookup: {off: 0, breathing: 1, candlelight: 2, fading: 3, flash: 4},
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x051f, type: 0x23},
            description: "RGB dynamic effect type for LED bulb",
            zigbeeCommandOptions: {manufacturerCode},
        }),

        // RGB Effect Speed
        m.numeric({
            name: "rgb_effect_speed",
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x0520, type: 0x20},
            description: "RGB dynamic effect speed (1-100%)",
            zigbeeCommandOptions: {manufacturerCode},
            unit: "%",
            valueMin: 1,
            valueMax: 100,
            valueStep: 1,
        }),
    ],

    meta: {},

    exposes: [
        // RGB dynamic effects
        exposes
            .list("rgb_effect_colors", ea.SET, exposes.composite("color", "color", ea.SET)
                .withFeature(exposes.numeric("r", ea.SET).withValueMin(0).withValueMax(255).withDescription("Red (0-255)"))
                .withFeature(exposes.numeric("g", ea.SET).withValueMin(0).withValueMax(255).withDescription("Green (0-255)"))
                .withFeature(exposes.numeric("b", ea.SET).withValueMin(0).withValueMax(255).withDescription("Blue (0-255)")))
            .withDescription("Array of RGB color objects for dynamic effects (1-8 colors)")
            .withLengthMin(1)
            .withLengthMax(8)
            .withCategory("config"),

        exposes
            .numeric("rgb_effect_brightness", ea.SET)
            .withValueMin(1)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit("%")
            .withDescription("RGB dynamic effect brightness (1-100%)")
            .withCategory("config"),
    ],

    toZigbee: [
        {
            key: ["rgb_effect_colors", "rgb_effect_brightness"],
            convertSet: async (entity, key, value, meta) => {
                // Read from incoming message first (allows single MQTT payload with all params),
                // then fall back to state, then to defaults
                const colors = meta.message.rgb_effect_colors || meta.state.rgb_effect_colors || [{r: 255, g: 0, b: 0}, {r: 0, g: 255, b: 0}, {r: 0, g: 0, b: 255}];
                const brightnessPercent = meta.message.rgb_effect_brightness ?? meta.state.rgb_effect_brightness ?? 100;

                // Colors should now be an array of RGB objects
                const colorList = colors;

                if (!Array.isArray(colorList) || colorList.length < 1 || colorList.length > 8) {
                    throw new Error("Must provide array of 1-8 RGB color objects");
                }

                if (brightnessPercent < 1 || brightnessPercent > 100) {
                    throw new Error("Brightness must be between 1 and 100%");
                }

                // Convert brightness percentage to 8-bit value (0-255)
                const brightness8bit = Math.round((brightnessPercent / 100) * 255);

                // Encode all colors for the color message
                const colorBytes = [];
                for (const color of colorList) {
                    const encoded = encodeColor(color);
                    colorBytes.push(...encoded);
                }

                // Build color message (0x03 prefix) - sent to 0x0527
                const msg1Length = 3 + colorList.length * 4;
                const msg1 = Buffer.from([0x01, 0x01, 0x03, msg1Length, brightness8bit, 0x00, colorList.length, ...colorBytes]);

                const ATTR_RGB_COLORS = 0x0527;

                // Send colors to 0x0527
                await entity.write(
                    "manuSpecificLumi",
                    {[ATTR_RGB_COLORS]: {value: msg1, type: 0x41}},
                    {manufacturerCode, disableDefaultResponse: false},
                );

                // Determine correct state key based on device type
                const deviceType = getDeviceType(meta);
                const stateKey = deviceType === "t1m" ? "state_rgb" : "state";

                return {
                    state: {
                        rgb_effect_colors: colors,
                        rgb_effect_brightness: brightnessPercent,
                        [stateKey]: "ON",
                    },
                };
            },
        },
    ],
};
