# Aqara-T2-bulb
Zigbee2MQTT external converter with Dynamic RGB Effects for the Aqara T2 RGB bulb.  

Dynamic RGB Effects have the following properties:

1. Effect Type: Breathing, Candlelight, Fading, Flash. 
2. Brightness: 1% - 100%
3. Speed: 1% - 100%
4. Colours: Between 1 and 8 colours can be set for each effect, the bulb cycles through the colours in order. The colour slots are defined by a comma seperated list of RGB hex values, e.g. #ff0000,#00ff00,#0000ff for a red, green, blue cycle.

## Installation

*Requires Zigbee2MQTT 2.7.0 or above*

In Zigbee2MQTT go to **settings** → **dev console** → **external converters**, create a new converter named **t2.mjs** and paste in the contents of the file. Click save then restart Zigbee2MQTT via **settings** → **tools**

Alternatively place the file **t2.mjs** in the folder **zigbee2mqtt/data/external_converters** and restart Zigbee2MQTT.

If an external converter is active for a device a cyan icon with "Supported: external" will be displayed under the device name in Zigbee2MQTT.

## Home Assistant
The Home Assistant folder contains a collection of blueprint, scripts, cards and examples.

### aqara_t2_effects_blueprint.yaml
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
   - **Effect Brightnes**: Percentage between 1 and 100
   - **Effect Speed**: Percentage between 1 and 100
5. Save the script

#### 3. Running a created script
Once created, you can run a script in several ways:

1. **Manually**: Go to **Settings** → **Automations & Scenes** → **Scripts** and run it
2. **Dashboard Button**: Add a script button to your dashboard
3. **Automation**: Trigger it from an automation


Notes:


  • This converter mimics the dynamic RGB effect creation and preview feature of the Aqara Home app.
  
  • The dynamic RGB effects are not written as scenes to the bulb's memory as they are when using the Aqara app. That process is done via OTA firmware writes which are not implemented here.
  
  • Activating such saved effect scenes as well as the bulb's built in scenes appears to have some sort of vendor lock. Possibly the bulb is checking if the Zigbee commands are coming from an Aqara hub and won't activate them if the source IEEE address doesn't match.
  
• As such, every time you want to activate a particular effect you will have to send the parameters for that effect to the bulb again (colour selections, brightness, speed and effect type). 

• White Dynamic Effects are similarly done via OTA firmware writes, however the preview feature is also done this way with these effects.

• Further investigation needs to be done on the White Dynamic Effects and also the OTA firmware writing process to see how these can be replicated.
