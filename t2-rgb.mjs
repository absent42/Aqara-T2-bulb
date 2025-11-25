import * as exposes from "zigbee-herdsman-converters/lib/exposes";
import * as lumi from "zigbee-herdsman-converters/lib/lumi";
import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import "zigbee-herdsman-converters/lib/types";

const {manufacturerCode} = lumi;
const ea = exposes.access;

// Build RGB dynamic effect messages
function buildRGBEffectMessages(colorList, brightness8bit, effectId, speed) {
    // Encode all colors
    const colorBytes = [];
    for (const color of colorList) {
        const encoded = encodeColor(color);
        colorBytes.push(...encoded);
    }

    // Message 1: Colors (0x03)
    const msg1Length = 3 + colorList.length * 4;
    const msg1 = Buffer.from([0x01, 0x01, 0x03, msg1Length, brightness8bit, 0x00, colorList.length, ...colorBytes]);

    // Message 2: Effect Type (0x04)
    // Format is identical for T1M and T2
    const msg2 = Buffer.from([0x01, 0x01, 0x04, 0x0c, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, effectId]);

    // Message 3: Speed (0x05)
    const msg3 = Buffer.from([0x01, 0x01, 0x05, 0x01, speed]);

    return {msg1, msg2, msg3};
}

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

    // Convert to XYZ using sRGB D65
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

function encodeColor(hexColor) {
    const normalized = hexColor.toUpperCase().replace("#", "");

    if (!/^[0-9A-F]{6}$/.test(normalized)) {
        throw new Error(`Invalid color format: ${hexColor}. Use format #RRGGBB (e.g., #FF0000)`);
    }

    const r = Number.parseInt(normalized.substr(0, 2), 16);
    const g = Number.parseInt(normalized.substr(2, 2), 16);
    const b = Number.parseInt(normalized.substr(4, 2), 16);

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
        await endpoint.read("manuSpecificLumi", [0x0528], {manufacturerCode: manufacturerCode}); // Read transition_curve_curvature
        await endpoint.read("manuSpecificLumi", [0x052c], {manufacturerCode: manufacturerCode}); // Read transition_initial_brightness
        await endpoint.read("manuSpecificLumi", [0x0515], {manufacturerCode: manufacturerCode}); // Read dimming_range_minimum
        await endpoint.read("manuSpecificLumi", [0x0516], {manufacturerCode: manufacturerCode}); // Read dimming_range_maximum
    },

    extend: [
        lumi.lumiModernExtend.lumiLight({
            colorTemp: true,
            color: true,
            colorTempRange: [111, 500],
        }),

        m.identify(),
        lumi.lumiModernExtend.lumiPowerOnBehavior({lookup: {off: 0, on: 1, reverse: 2, restore: 3}}),
        m.forcePowerSource({powerSource: "Mains (single phase)"}),
        lumi.lumiModernExtend.lumiZigbeeOTA(),

        m.numeric({
            name: "transition_curve_curvature",
            label: "Transition Curve Curvature",
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x0528, type: 0x39},
            description: "Range: 0.2~6. a=0.2?1: first fast and then slow; a=1: uniform; a=1~6: first slow and then fast (step size 0.01)",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode},
            valueMin: 0.2,
            valueMax: 6,
            valueStep: 0.01,
        }),

        m.numeric({
            name: "transition_initial_brightness",
            label: "Initial Brightness",
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x052c, type: 0x20},
            description: "After turning on the light, the light will brighten from the preset brightness",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode},
            unit: "%",
            valueMin: 0,
            valueMax: 50,
            valueStep: 1,
        }),

        m.numeric({
            name: "off_on_duration",
            label: "Off to On dimming duration",
            cluster: "genLevelCtrl",
            attribute: {ID: 0x0012, type: 0x21},
            description: "The light will gradually brighten according to the set duration",
            entityCategory: "config",
            unit: "s",
            valueMin: 0,
            valueMax: 10.5,
            valueStep: 0.5,
            scale: 10,
        }),

        m.numeric({
            name: "on_off_duration",
            label: "On to Off dimming duration",
            cluster: "genLevelCtrl",
            attribute: {ID: 0x0013, type: 0x21},
            description: "The light will gradually dim according to the set duration",
            entityCategory: "config",
            unit: "s",
            valueMin: 0,
            valueMax: 10.5,
            valueStep: 0.5,
            scale: 10,
        }),

        m.numeric({
            name: "dimming_range_minimum",
            label: "Dimming Range Minimum",
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x0515, type: 0x20},
            description: "Minimum Allowed Dimming Value",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode},
            unit: "%",
            valueMin: 1,
            valueMax: 100,
            valueStep: 1,
        }),

        m.numeric({
            name: "dimming_range_maximum",
            label: "Dimming Range Maximum",
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x0516, type: 0x20},
            description: "Maximum Allowed Dimming Value",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode},
            unit: "%",
            valueMin: 1,
            valueMax: 100,
            valueStep: 1,
        }),

        // RGB Effect Type - T2 specific mappings
        m.enumLookup({
            name: "rgb_effect",
            lookup: {off: 0, breathing: 1, candlelight: 2, fading: 3, flash: 4},
            cluster: "manuSpecificLumi",
            attribute: {ID: 0x051f, type: 0x23},
            description: "RGB dynamic effect type for ring light",
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
            .text("rgb_effect_colors", ea.SET)
            .withDescription("Comma-separated RGB hex colors (e.g., #FF0000,#00FF00,#0000FF). 1-8 colors")
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
                const colors = meta.message.rgb_effect_colors || meta.state.rgb_effect_colors || "#FF0000,#00FF00,#0000FF";
                const brightnessPercent = meta.message.rgb_effect_brightness ?? meta.state.rgb_effect_brightness ?? 100;

                // Parse colors
                const colorList = colors.split(",").map((c) => c.trim());

                if (colorList.length < 1 || colorList.length > 8) {
                    throw new Error("Must provide 1-8 colors");
                }

                if (brightnessPercent < 1 || brightnessPercent > 100) {
                    throw new Error("Brightness must be between 1 and 100%");
                }

                // Convert brightness percentage to 8-bit value (0-254)
                const brightness8bit = Math.round((brightnessPercent / 100) * 254);

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

                // Update state - ring light turns on when effects are activated
                return {
                    state: {
                        rgb_effect_colors: colors,
                        rgb_effect_brightness: brightnessPercent,
                        state: "ON",
                    },
                };
            },
        },
        {
            key: ["dimming_range_minimum", "dimming_range_maximum"],
            convertSet: async (entity, key, value, meta) => {
                // Validate that min doesn't exceed max
                const newMin = key === "dimming_range_minimum" ? value : meta.state.dimming_range_minimum;
                const newMax = key === "dimming_range_maximum" ? value : meta.state.dimming_range_maximum;

                if (newMin !== undefined && newMax !== undefined && newMin > newMax) {
                    throw new Error(`Minimum (${newMin}%) cannot exceed maximum (${newMax}%)`);
                }

                const attrId = key === "dimming_range_minimum" ? 0x0515 : 0x0516;
                await entity.write("manuSpecificLumi", {[attrId]: {value, type: 0x20}}, {manufacturerCode});

                return {state: {[key]: value}};
            },
        },
    ],
};
