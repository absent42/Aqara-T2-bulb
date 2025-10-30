# Aqara-T2-bulb
Zigbee2MQTT external converter with Dynamic RGB Effects for the Aqara T2 RGB bulb. 

Dynamic RGB Effects have the following properties:

1. Effect Type: Breathing, Candlelight, Fading, Flash. 
2. Brightness: 1% - 100%
3. Speed: 1% - 100%
4. Colours: Between 1 and 8 colours can be set for each effect, the bulb cycles through the colours in order. The colour slots are defined by a coma seperated list of RGB hex values, e.g. #ff0000,#00ff00,#0000ff for a red, green, blue cycle.
   

Notes:


  • This converter mimics the dynamic RGB effect creation and preview feature of the Aqara Home app.
  
  • The dynamic RGB effects are not written as scenes to the bulb's memory as they are in the Aqara app. That process is done via OTA firmware writes which are not implemented here.
  
  • Activating such saved effect scenes as well as the bulb's built in scenes appears to have some sort of vendor lock. Possibly the bulb is checking if the Zigbee commands are coming from an Aqara hub and won't activate them if the source IEEE address doesn't match.
  
• As such, every time you want to activate a particular effect you will have to send the parameters for that effect to the bulb again (colour selections, brightness, speed and effect type). 

• White Dynamic Effects are similarly done via OTA firmware writes, however the preview feature is also done this way with these effects.

• Further investigation needs to be done on the White Dynamic Effects and also the OTA firmware writing process to see how these can be replicated.
