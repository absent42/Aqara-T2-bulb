# Aqara-T2-bulb
Zigbee2MQTT external converter with Dynamic RGB Effects for the Aqara T2 RGB bulb.  

*This converter will be included in Zigbee2MQTT 2.7.2 and no longer needed after that release*

Dynamic RGB Effects have the following properties:

1. Effect Type: Breathing, Candlelight, Fading, Flash. 
2. Speed: 1% - 100%
3. Colours: Between 1 and 8 colours can be set for each effect, the bulb cycles through the colours in order.

## Installation

*Requires Zigbee2MQTT 2.7.0 or above*

In Zigbee2MQTT go to **settings** → **dev console** → **external converters**, create a new converter named **t2-rgb.mjs** and paste in the contents of the file. Click save then restart Zigbee2MQTT via **settings** → **tools**

Alternatively place the file **t2-rgb.mjs** in the folder **zigbee2mqtt/data/external_converters** and restart Zigbee2MQTT.

If an external converter is active for a device a cyan icon with "Supported: external" will be displayed under the device name in Zigbee2MQTT.

## Home Assistant

**Use the Aqara Advanced Lighting Home Assistant integration to make custom effects, trigger effects, and utilise them in automations - https://github.com/absent42/Aqara-Advanced-Lighting**

### aqara_t2_rgb_effects_blueprint.yaml
Home Assistant script blueprint for custom RGB dynamic effects.

#### 1. Import the Blueprint
1. In Home Assistant, go to **Settings** → **Automations & Scenes** → **Blueprints**
2. Click the **Import Blueprint** button
3. Paste the URL to this blueprint file or upload it directly
4. Click **Preview** and then **Import**

#### 2. Create a Script from the Blueprint
1. Go to **Settings** → **Automations & Scenes** → **Scripts**
2. Click **Add Script** → **Create new script from blueprint**
3. Select **Aqara T2 - RGB Dynamic Effect Script**
4. Configure the script:
   - **Name**: Give it a descriptive name (e.g., "T2 Effect")
   - **Target lights**: Select one of more Aqara T2 lights. 
   - **RGB Effect**: Select the dynamic effect to use
   - **Number of colors**: Set the number of color pickers the effect pattern will use
   - **Color Pickers**: Configure the number of color pickers selected in the step above.
   - **Effect Speed**: Percentage between 1 and 100
5. Save the script

#### 3. Running a created script
Once created, you can run a script in several ways:

1. **Manually**: Go to **Settings** → **Automations & Scenes** → **Scripts** and run it
2. **Dashboard Button**: Add a script button to your dashboard
3. **Automation**: Trigger it from an automation

### aqara_t2_rgb_effects_script_examples.yaml

These call the blueprint with 4 examples based on the presets in the Aqara Home app: Candlelight, Breath, Colorful, Security.

1. Replace light.your_t1m_light with your bulb's actual RGB entity ID
2. Add the scripts code to your scripts.yaml

### aqara_t2_rgb_effects_card.yaml

Simple dashboard buttons card example for activating RGB dynamic effects scripts. Requires aqara_t2_rgb_effects_script_examples.yaml and aqara_t2_rgb_effects_blueprint.yaml

1. Edit your Home Assistant dashboard
2. Click **Add Card** >> **Manual**
3. Copy and paste in the YAML code
4. For the "Stop" button, replace light.your_t1m_light with your bulb's actual RGB entity ID

### Stopping Effects
Click the **Stop Effects** button to turn off the dynamic effect, or  
Click any static preset button, or
Adjust light settings manually or with automation 

### Finding Your Light Entity ID
**Settings** → **Entities**  
Find your T2 bulb
Note the RGB entity ID (e.g., light.living_room_lamp)
