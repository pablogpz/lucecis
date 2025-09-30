# Preamble

This document lays out the high-level specification of a webapp idea to control and visualize light devices
controlled by Home Assistant OS.

## For LLMs and AI agents

Take this document as the (mostly-complete) basis of the original idea from which to build upon and improve. You are
expected to follow the specifications and fill the gaps where told, but are also allowed to suggest improvements.

# Context

I want to build a small and cute webapp to control RGB lights in my room (adopted by Home Assistant) with the press of
a button. The functionality should only be available when presence detection senses that I'm present in my room. The
goal is to let my girlfriend control my lights from her home so she can grab my attention and be playful, that's why
I want the UI to have a cute aesthetic. The webapp is localized in Spanish as it's intended for my Spanish-speaking
girlfriend.

**Do Not Disturb**: To prevent disturbances during sleep hours, the system includes quiet hours (1:00 AM to 9:00 AM
local time) during which all light control functionality is disabled regardless of actual presence detection. This
ensures uninterrupted rest while maintaining the playful functionality during appropriate hours.

# App Content

The app consists of 3 main parts:

* A colored background that mimics how my lights are arranged in my room (2 to the sides, 1 in the middle and on top).
  Each light is represented by a point light source shining with the current color of the actual device, and it reacts
  to changes to its color. The result should be a simulated illumination pattern that smoothly blends the color of all
  the lights (and smoothly transitions to new color arrangements when light color changes). The background should be
  like an empty white wall where the glow of the lights colors it entirely with their radial gradients filling the
  full page and scale properly across different screen resolutions and aspect ratios.
* A centered floating section surrounded by the background on all sides with the app contents. It contains:
    * A big and stylised button that can be pressed to alter the lights in some way (i.e a strobing effect, a disco
      effect, changing colors, etc...). Some light effects can take optional parameters that may be tweaked by the user
      via form controls. Since I'm supporting multiple effects, there's a tab-style selector to change between the
      effects triggered by the button, and the button changes styles depending on the selected effect.
    * A presence detection sensor that indicates if I'm present in the room. The button should not work if I'm not
      present in the room. Text displays "Presente" when present and "Ausente" when absent.
* A cute cat companion resting on top of the centered section whose pupils follow the cursor's movement within larger,
  cartoon-style eyes to avoid uncanny movement. Besides being cute, it also serves as a display user messages
  encapsulated in bubble text. The animal sprite may also support animations and transitions. The companion exhibits
  sleeping behavior when either presence detection is off or the connection to the backend is lost, showing closed
  eyes and disabling interactive features like pupil movement and speech bubbles.

# Technical Details

## Frontend

* The app's platform target is web apps. The web server and client are built with an up-to-date version of Next.js,
  React and Typescript.
* The app uses Poppins font family for a friendly, rounded aesthetic that complements the cute design.
* The app is localized in Spanish, with UI elements like "Interruptor", "Parpadear", "Presente/Ausente", "Activar", etc.
* The server communicates with Home Assistant OS via its native WebSocket API. It subscribes to changes in light states
  and presence detection to get updates in real time, and it sends commands to play light effects in response to
  user input. Whenever possible light effects are programmed in Home Assistant. Only fallback to implement it in the web
  server if not possible.
* The backend needs to work as a middleman between the native Home Assistant WebSocket API and a separate WebSocket API
  that the frontend connects to for security reasons. This prevents exposing authenticated connections or access tokens
  to the open internet. The backend implements both a WebSocket client (for Home Assistant communication) and a
  WebSocket server (for frontend communication).
* Client's background light simulation: Implemented using CSS radial gradients with blur effects and multiply blend mode
  to create realistic light mixing on a white background. Each light creates multiple gradient layers for ambient and
  focused illumination that scale with brightness. The lights create opaque color blending similar to mixing paint
  rather than having discernible central light sources. Uses viewport-responsive sizing with aspect ratio correction
  to maintain consistent positioning across different screen dimensions.
* Client's cute animal behaviour and animation: Cat companion with larger 7x7 cartoon-style eyes positioned closer
  together where pupils (4x4 units) move within the eye boundaries instead of moving the entire eye. The companion
  container is sized at 20x20 units to accommodate visible ears positioned at the top. Includes blinking animation
  and speech bubble message display functionality. **Sleeping State**: The companion enters a sleeping state when
  either presence detection shows the user is absent or the WebSocket connection to the backend is lost. When sleeping,
  the companion displays closed eyes, disables pupil movement and blinking animations, and hides speech bubbles. A "Zzz"
  message bubble may appear to indicate the sleeping state. The companion automatically wakes up when both presence and
  connection are restored.
* Client's UI cute aesthetic styling: Uses Poppins font family for friendly, rounded typography. Spanish localization
  throughout the interface.

## Backend Architecture

### WebSocket Middleman Server

The backend acts as a secure bridge between the frontend and Home Assistant:

* **Home Assistant Communication**: Uses the official `home-assistant-js-websocket` library to connect to Home
  Assistant's WebSocket API at `https://homeassistant:8123` with long-lived token authentication.
* **Entity Subscription**: Subscribes to specific light entity state changes using `subscribe_trigger` with platform
  `state` to minimize overhead compared to subscribing to all state changes.
* **WebSocket Server**: Exposes an unauthenticated WebSocket server on port 8080 for frontend connections, providing a
  secure abstraction layer.

### Entity Reference

* **Light Entities**:
    - Left light: `light.hue_play_left`
    - Right light: `light.hue_play_right`
    - Center light: `light.hue_go`
    - Group target for actions: `light.better_dormitorio_group`
    - Effect script: `script.light_effect_activator`
* **Presence Detection**:
    - Presence sensor: `binary_sensor.pablo_in_bedroom`
* **Light Effects Script**:
    - Script entity: `script.light_effect_activator`

### Communication Protocol

* **Frontend → Backend**: JSON messages with types `action` (toggle/color/strobe/effect) and `subscribe`
* **Backend → Frontend**: JSON messages with types `light_update`, `presence_update`, `connection_status`,
  `activator_status`, and `error`
* **Script State Tracking**: Backend monitors the `script.light_effect_activator` entity state to track when light
  effects are running. When the script state is 'on', the frontend disables the main trigger button to prevent
  conflicts. A generous timeout ensures the button re-enables even if communication is lost.
* **Light Actions**:
    - Toggle: Calls `light.toggle` service
    - Color: Supports both group and individual light control modes:
        - **Group Mode** (default): Calls `light.turn_on` service with RGB and brightness parameters on
          `light.better_dormitorio_group`
        - **Individual Mode**: Calls `light.turn_on` service separately for each light entity (`light.hue_play_left`,
          `light.hue_play_right`, `light.hue_go`) with their respective colors and brightness
    - Strobe/Effects: Calls `script.turn_on` with effect name and duration

#### Individual Light Control Protocol

The color action has been enhanced to support individual light control:

* **Toggle Switch**: Frontend provides a toggle in the Color tab to switch between group and individual control modes
* **Individual Color Pickers**: When individual mode is enabled, three separate color pickers are displayed for left,
  center, and right lights
* **Message Format**: Color action messages include:
    - `isIndividualMode: boolean` - indicates if individual control is active
    - `individualLights: Array` - when in individual mode, contains array of objects with `entity_id`, `rgb_color`, and
      `brightness` for each light
    - Traditional `rgb_color` and `brightness` fields are used for group mode
* **Server Processing**: Backend detects individual mode and sends separate `light.turn_on` service calls to each
  specified entity instead of using the light group

## Security Features

* **IP Whitelisting + mTLS**: Access restricted to specific IP addresses and mutual-TLS authentication via Nginx
  configuration
* **SSL/TLS Encryption**: HTTPS with Let's Encrypt certificates
* **Isolated WebSocket**: Backend prevents direct Home Assistant API exposure
* **Do Not Disturb**: Automatic blocking during quiet hours (1:00 AM - 9:00 AM)Configurable time window (default: 1:00
  AM to 9:00 AM local server time) during which all light control functionality is disabled. During DND hours, the
  server reports presence as `false` regardless of actual sensor state, causing the frontend to display "Ausente" and
  disable all controls. Server-side message handler blocks all `action` type messages during DND hours, returning error
  "Actions are not allowed during quiet hours (1:00 AM - 9:00 AM)" to connected clients. `subscribe` messages continue
  to work during DND to maintain real-time state updates, but no actions can be triggered. Combines presence state
  override and direct action blocking to ensure no disturbances even for clients connected before DND hours begin.

### Development Setup

* **Scripts**: `npm run server` to start backend, `npm run start:dev` to run both frontend and backend concurrently
* **Environment**: Requires `HA_ACCESS_TOKEN` environment variable for Home Assistant authentication

## Deployment Architecture

* **Platform**: Raspberry Pi 5 with Home Assistant OS
* **Reverse Proxy**: Nginx serving the app at `/lucecis` route
* **Network Setup**: Router port forwarding (80/443) with DDNS domain
* **SSL**: Automated certificate management with Certbot

## Development vs Production

* **Development**: Direct WebSocket connection to localhost:8080
* **Production**: WebSocket traffic routed through Nginx proxy at `/ws` endpoint
* **Build Configuration**: Next.js standalone output with proper basePath for deployment
* **Environment**: Secure environment variable management with dotenv

## Monitoring Architecture

- **Grafana** - Beautiful dashboards and visualization
- **Prometheus** - Time-series database and metrics collection
- **Node Exporter** - System metrics (CPU, RAM, disk, network)
- **Custom App Metrics** - WebSocket connections, Home Assistant status