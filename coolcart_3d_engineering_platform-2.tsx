import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Snowflake, Sun, Eye, EyeOff, RotateCcw, Compass, Plus, Minus
} from 'lucide-react';

// ============================================================================
// 1. CENTRALIZED ENGINEERING REGISTRY & PROVISIONAL ASSUMPTIONS
// ============================================================================
const COMPONENT_REGISTRY = [
  // --- A. CART ASSEMBLY ---
  {
    id: 'cart_frame',
    name: 'Conventional Pushcart Chassis',
    shortLabel: 'CART CHASSIS',
    shortDesc: 'Existing street-vendor pushcart frame supporting the modular cooling unit.',
    category: 'CART',
    parent: 'Cart Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0, -0.32, 0],
    purpose: 'Represents an existing traditional Indian street-vendor pushcart (Thela) frame constructed from welded mild-steel angle iron and seasoned hardwood planking.',
    interactions: 'Supports the Detachable Mounting Rails via clamping brackets without requiring permanent structural welding on the vendor’s existing cart.',
    connections: { mechanical: 'Clamped to Mounting Rails; rests on Axle & Wheel assembly.', thermal: 'Ambient air clearance below bed.', electrical: 'Isolated from DC system.' },
    engineeringNote: 'Cart dimensions vary across regions; mounting rails use slotted tolerances (Unvalidated).'
  },
  {
    id: 'cart_wheels',
    name: 'Spoked Wheels & Steel Axles',
    shortLabel: 'WHEELS & AXLES',
    shortDesc: 'Rolling undercarriage supporting the vendor cart and attachment payload.',
    category: 'CART',
    parent: 'Cart Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0, -0.62, 0],
    purpose: 'Provides rolling mobility over uneven urban street surfaces, curbs, and market pathways.',
    interactions: 'Transfers road shock to the main cart frame, motivating the elastomer vibration-isolation pads beneath the refrigeration unit.',
    connections: { mechanical: 'Bolted to lower cart leaf/axle mounts.', thermal: 'None.', electrical: 'None.' },
    engineeringNote: 'Added mass of the CoolCart module + battery + payload must be evaluated against existing axle limits.'
  },
  {
    id: 'cart_handle',
    name: 'Tubular Steel Push Handle',
    shortLabel: 'PUSH HANDLE',
    shortDesc: 'Primary ergonomic push bar positioned adjacent to the operator status display.',
    category: 'CART',
    parent: 'Cart Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-0.65, 0, 0],
    purpose: 'Primary ergonomic push/pull bar used by the vendor to maneuver the cart.',
    interactions: 'Positioned adjacent to the Local Status Display and Electrical Enclosure so the operator can monitor chamber temperature from the handle.',
    connections: { mechanical: 'Bolted to rear cart uprights.', thermal: 'None.', electrical: 'None.' },
    engineeringNote: 'Sightlines over the insulated compartment require ergonomic verification.'
  },

  // --- B. MOUNTING ASSEMBLY ---
  {
    id: 'mount_rails',
    name: 'Slotted Mounting Frame',
    shortLabel: 'MOUNTING FRAME',
    labelNum: '10',
    labelSide: 'right',
    shortDesc: 'Detachable structural channel frame bridging the vendor cart and cooling module.',
    category: 'MOUNTING',
    parent: 'Mounting Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [0, -0.16, 0],
    purpose: 'Forms the modular structural bridge between the non-standardized vendor pushcart deck and the CoolCart attachment.',
    interactions: 'Clamps to the cart deck via J-brackets below, and receives the storage compartment and equipment skid on elastomer isolators above.',
    connections: { mechanical: 'Powder-coated steel channels with slotted adjustment holes.', thermal: 'Creates a 40mm ventilation gap under the cold chamber.', electrical: 'Provides routing channel for armored DC conduit.' },
    engineeringNote: 'Requires structural road-bump fatigue validation before specifying steel gauge.'
  },
  {
    id: 'mount_brackets',
    name: 'Detachable Clamping Brackets',
    shortLabel: 'CLAMP BRACKETS',
    shortDesc: 'Secures the mounting rails to the existing cart bed without permanent welding.',
    category: 'MOUNTING',
    parent: 'Mounting Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0, -0.24, 0.52],
    purpose: 'Secures the modular attachment to the existing cart frame while allowing seasonal or servicing removal.',
    interactions: 'Clamps around the perimeter edge of the cart bed without drilling through primary load beams.',
    connections: { mechanical: 'Corrosion-resistant fasteners and J-clamps.', thermal: 'None.', electrical: 'None.' },
    engineeringNote: 'Adapter plates will be required for varying regional cart bed widths.'
  },
  {
    id: 'mount_isolators',
    name: 'Elastomer Vibration Isolators',
    shortLabel: 'VIBRATION PADS',
    shortDesc: 'Absorbs street shock and compressor vibration to protect refrigerant joints.',
    category: 'MOUNTING',
    parent: 'Mounting Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [0, -0.08, -0.42],
    purpose: 'Dampens both road shock from uneven streets and operational vibration from the compressor.',
    interactions: 'Sandwiched between the Slotted Mounting Rails and the Refrigeration/Storage sub-frames.',
    connections: { mechanical: 'Compression-mounted elastomer pads.', thermal: 'Acts as a thermal break between steel rails and cold box.', electrical: 'Electrically insulating.' },
    engineeringNote: 'Critical for preventing copper refrigerant braze-joint fatigue over rough pavement.'
  },

  // --- C. INSULATED STORAGE COMPARTMENT ---
  {
    id: 'storage_outer',
    name: 'Outer Protective Compartment Shell',
    shortLabel: 'OUTER SHELL',
    shortDesc: 'Weather-resistant exterior structural enclosure protecting the thermal core.',
    category: 'STORAGE',
    parent: 'Storage Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [0.22, 0.10, 0],
    purpose: 'Weather-resistant structural exterior enclosure protecting the thermal insulation layer from impact, solar radiation, and street dust.',
    interactions: 'Houses the rigid insulation core, supports the top access lid hinges, and interfaces with the thermal bulkhead next to the compressor bay.',
    connections: { mechanical: 'Bolted to isolation mounts.', thermal: 'Reflective exterior finish reduces solar heat gain.', electrical: 'Sealed pass-through grommets.' },
    engineeringNote: 'Provisional outer footprint modeled for visual layout; internal volume and payload weight require validation.'
  },
  {
    id: 'storage_insulation',
    name: 'High-Density Insulation Panels',
    shortLabel: 'INSULATION',
    labelNum: '03',
    labelSide: 'right',
    shortDesc: 'Multi-wall rigid thermal barrier panels between the outer shell and inner liner.',
    category: 'STORAGE',
    parent: 'Storage Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0.22, 0.44, 0],
    purpose: 'Minimizes conductive and convective heat ingress from hot ambient street environments into the chilled produce chamber.',
    interactions: 'Encapsulates the Inner Storage Liner on all faces, including an extra-thick thermal barrier wall adjacent to the compressor bay.',
    connections: { mechanical: 'Fitted panel assembly between Outer Shell and Inner Liner.', thermal: 'Primary thermal barrier (Material & R-value TBD).', electrical: 'Sealed conduits prevent moisture migration.' },
    engineeringNote: 'Wall thickness vs. usable internal storage volume must be optimized via thermal load modeling.'
  },
  {
    id: 'storage_liner',
    name: 'Hygienic Inner Storage Liner',
    shortLabel: 'INNER LINER',
    labelNum: '02',
    labelSide: 'right',
    shortDesc: 'Washable interior produce chamber with ventilated crate dividers and evaporator mounts.',
    category: 'STORAGE',
    parent: 'Storage Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [0.22, 0.80, 0],
    purpose: 'Smooth, washable interior chamber holding perforated produce crates and directing condensation toward the bottom drain.',
    interactions: 'Surrounds the internal Evaporator assembly and houses the Internal Temperature & Humidity sensors.',
    connections: { mechanical: 'Seamless formed liner with removable ventilated produce dividers.', thermal: 'Cooled via internal convection across the Evaporator.', electrical: 'None.' },
    engineeringNote: 'Intended for food-contact-compatible materials; no certification is claimed at this concept stage.'
  },
  {
    id: 'storage_lid',
    name: 'Multi-Layer Insulated Top Lid',
    shortLabel: 'INSULATED LID',
    labelNum: '01',
    labelSide: 'right',
    shortDesc: 'Top-opening chest lid with outer shell, foam core, and inner liner to retain dense cold air.',
    category: 'STORAGE',
    parent: 'Storage Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [0.22, 1.32, 0],
    purpose: 'Top-opening chest-style access door that minimizes cold-air spill when the vendor opens the compartment during sales.',
    interactions: 'Separates in exploded view into its outer structural skin, rigid insulation core, and hygienic inner lid liner.',
    connections: { mechanical: 'Heavy-duty rear barrel hinges and front over-center compression latches.', thermal: 'Insulated core prevents top-surface solar heat gain.', electrical: 'None.' },
    engineeringNote: 'Chest-style top loading retains dense cold air better than vertical doors.'
  },
  {
    id: 'storage_gasket',
    name: 'Perimeter Compression Gasket',
    shortLabel: 'DOOR GASKET',
    shortDesc: 'Continuous flexible perimeter seal preventing warm, humid ambient air infiltration.',
    category: 'STORAGE',
    parent: 'Storage Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0.22, 1.06, 0],
    purpose: 'Creates an airtight perimeter seal between the Insulated Lid and the Storage Compartment rim.',
    interactions: 'Reduces latent heat load and frost accumulation on the evaporator caused by humid outside air.',
    connections: { mechanical: 'Snap-fit replaceable elastomer profile.', thermal: 'Seals convective air gap.', electrical: 'None.' },
    engineeringNote: 'Must remain pliable across ambient street temperatures and resist tearing from produce crates.'
  },
  {
    id: 'storage_drain',
    name: 'Condensation Drain & Trap',
    shortLabel: 'DRAIN PORT',
    shortDesc: 'Routes melted frost and washdown water safely clear of electrical bays.',
    category: 'STORAGE',
    parent: 'Storage Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [0.35, -0.32, -0.35],
    purpose: 'Allows melted frost, produce transpiration moisture, and washdown water to exit the bottom of the storage liner cleanly.',
    interactions: 'Routes water below the cart chassis away from the battery and electronics enclosures.',
    connections: { mechanical: 'Sloped sump with valved flexible drain tube.', thermal: 'Trap prevents warm air draft upward.', electrical: 'Routed clear of electrical harnesses.' },
    engineeringNote: 'High monsoon humidity makes condensation management a critical validation item.'
  },

  // --- D. ACTIVE REFRIGERATION SYSTEM ---
  {
    id: 'ref_compressor',
    name: 'DC Refrigeration Compressor',
    shortLabel: 'COMPRESSOR',
    labelNum: '05',
    labelSide: 'left',
    shortDesc: 'Circulates refrigerant through the active cooling loop via a dedicated driver.',
    category: 'REFRIGERATION',
    parent: 'Refrigeration Assembly',
    status: 'REQUIRES VALIDATION',
    basePos: [0, 0, 0],
    explodeVec: [-0.75, 0.12, -0.25],
    purpose: 'Draws low-pressure refrigerant vapor from the evaporator and compresses it into high-pressure, high-temperature vapor for heat rejection.',
    interactions: 'Driven by its Dedicated Electronic Compressor Driver Module (not directly from an ESP32 GPIO pin). Mounted on vibration isolators in the ventilated equipment bay.',
    connections: { mechanical: 'Sub-frame mounted with rubber grommets.', thermal: 'Pumps heat from Evaporator to Condenser.', electrical: 'Powered via fused high-current DC bus through motor controller.' },
    engineeringNote: 'Compressor model, displacement, refrigerant type, and DC voltage are unvalidated placeholders.'
  },
  {
    id: 'ref_condenser',
    name: 'Finned Heat-Rejection Condenser',
    shortLabel: 'CONDENSER',
    labelNum: '06',
    labelSide: 'left',
    shortDesc: 'Rejects heat extracted from the produce chamber to the outside ambient air.',
    category: 'REFRIGERATION',
    parent: 'Refrigeration Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-1.02, 0.16, 0.20],
    purpose: 'Rejects heat absorbed from the produce compartment into the outside ambient air.',
    interactions: 'Receives hot compressed refrigerant from the Compressor and relies on the Condenser Fan to force ambient air across its aluminum fins.',
    connections: { mechanical: 'Bracket-mounted behind louvered exhaust grill.', thermal: 'Hot-side heat exchanger; isolated from cold box by thermal bulkhead.', electrical: 'None.' },
    engineeringNote: 'Must be sized for high Indian ambient street temperatures and dusty outdoor air.'
  },
  {
    id: 'ref_fan',
    name: 'Condenser Exhaust Fan',
    shortLabel: 'CONDENSER FAN',
    shortDesc: 'Forces ambient air across the condenser fins to reject heat outside.',
    category: 'REFRIGERATION',
    parent: 'Refrigeration Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-1.28, 0.16, 0.20],
    purpose: 'Pulls ambient air through the intake louvers, forces it across the Condenser fins, and exhausts warm air away from the cart.',
    interactions: 'Operates in tandem with the Compressor via the refrigeration control interface.',
    connections: { mechanical: 'Shroud-mounted to Condenser face.', thermal: 'Drives external heat-rejection airflow.', electrical: 'Brushless DC fan powered via Power Distribution board.' },
    engineeringNote: 'Cleanable dust screen required to prevent street debris fouling condenser fins.'
  },
  {
    id: 'ref_expansion',
    name: 'Expansion Metering Device',
    shortLabel: 'EXPANSION DEVICE',
    shortDesc: 'Drops refrigerant pressure and temperature prior to entering the evaporator.',
    category: 'REFRIGERATION',
    parent: 'Refrigeration Assembly',
    status: 'REQUIRES VALIDATION',
    basePos: [0, 0, 0],
    explodeVec: [-0.52, 0.38, 0.08],
    purpose: 'Creates a pressure drop between the high-pressure liquid line exiting the condenser and the low-pressure evaporator inlet.',
    interactions: 'Meters chilled liquid refrigerant into the Evaporator inside the storage compartment.',
    connections: { mechanical: 'In-line copper capillary coil / expansion valve.', thermal: 'Adiabatic flash cooling transition.', electrical: 'Purely mechanical.' },
    engineeringNote: 'Capillary tube vs. thermostatic expansion valve selection depends on final refrigerant and load profile.'
  },
  {
    id: 'ref_evaporator',
    name: 'Internal Chamber Evaporator',
    shortLabel: 'EVAPORATOR',
    labelNum: '04',
    labelSide: 'right',
    shortDesc: 'Finned cold-wall heat exchanger absorbing heat from the interior produce chamber.',
    category: 'REFRIGERATION',
    parent: 'Refrigeration Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-0.08, 0.96, -0.14],
    purpose: 'Absorbs heat from the interior air of the insulated produce compartment as low-pressure liquid refrigerant evaporates.',
    interactions: 'Mounted inside the Inner Storage Liner on stainless standoffs behind a protective perforated guard.',
    connections: { mechanical: 'Standoff-mounted to inner cold wall.', thermal: 'Primary cooling surface inside storage chamber.', electrical: 'None.' },
    engineeringNote: 'Must maintain produce-safe temperatures without freezing leafy vegetables adjacent to the plate.'
  },
  {
    id: 'ref_tubing',
    name: 'Insulated Refrigerant Tubing',
    shortLabel: 'REFRIGERANT LINES',
    shortDesc: 'Closed-loop copper suction and liquid lines linking the refrigeration stages.',
    category: 'REFRIGERATION',
    parent: 'Refrigeration Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-0.58, 0.54, -0.10],
    purpose: 'Closed-loop hermetically brazed copper piping connecting Compressor, Condenser, Expansion Device, and Evaporator.',
    interactions: 'Passes through an insulated bulkhead gland between the hot equipment bay and the cold storage liner.',
    connections: { mechanical: 'Vibration-looped copper tubing.', thermal: 'Suction line insulated with closed-cell elastomeric foam.', electrical: 'None.' },
    engineeringNote: 'Requires strain-relief service loops to survive cart pushing vibrations.'
  },
  {
    id: 'ref_housing',
    name: 'Louvered Equipment Shroud',
    shortLabel: 'EQUIPMENT SHROUD',
    shortDesc: 'Ventilated protective guard and thermal bulkhead isolating the hot-side bay.',
    category: 'REFRIGERATION',
    parent: 'Refrigeration Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [-0.92, 0.48, -0.38],
    purpose: 'Protects the compressor and condenser from physical damage and splashes while ensuring unrestricted intake/exhaust airflow.',
    interactions: 'Includes an insulated internal partition separating hot-side refrigeration hardware from the cold storage box.',
    connections: { mechanical: 'Removable service panels with captive fasteners.', thermal: 'Separates intake air stream from heated exhaust stream.', electrical: 'Grounded metallic shroud.' },
    engineeringNote: 'Airflow short-circuiting is prevented via internal baffling.'
  },

  // --- E. BATTERY & POWER MANAGEMENT ---
  {
    id: 'pwr_enclosure',
    name: 'Serviceable Battery Enclosure',
    shortLabel: 'BATTERY HOUSING',
    shortDesc: 'Low-center-of-gravity weather-protected drawer housing the battery pack.',
    category: 'POWER',
    parent: 'Power Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [-0.48, -0.32, 0.52],
    purpose: 'Houses the battery pack and BMS in a lockable, splash-resistant, low-center-of-gravity enclosure.',
    interactions: 'Mounted low on the frame to keep the cart stable; allows servicing or plug-in charging.',
    connections: { mechanical: 'Heavy-gauge steel tray with positive locking latch.', thermal: 'Ventilated to prevent heat buildup.', electrical: 'Houses main disconnect switch and fuse block.' },
    engineeringNote: 'Low center of gravity is essential to prevent cart tipping on sloped streets.'
  },
  {
    id: 'pwr_battery',
    name: 'Encapsulated Battery Pack',
    shortLabel: 'BATTERY PACK',
    labelNum: '07',
    labelSide: 'left',
    shortDesc: 'Supplies electrical power to the refrigeration system and embedded controls.',
    category: 'POWER',
    parent: 'Power Assembly',
    status: 'REQUIRES VALIDATION',
    basePos: [0, 0, 0],
    explodeVec: [-0.48, -0.54, 0.84],
    purpose: 'Stores electrical energy to run the active refrigeration system and embedded electronics when disconnected from stationary power.',
    interactions: 'Slides out from the Battery Enclosure during inspection; supplies primary DC bus via integrated BMS.',
    connections: { mechanical: 'Secured inside Battery Enclosure with retention brackets.', thermal: 'Monitored by BMS thermal probe.', electrical: 'High-current DC terminals with shrouded safety connectors.' },
    engineeringNote: 'Battery chemistry, nominal voltage, Ah capacity, weight, and runtime require thermal-load validation.'
  },
  {
    id: 'pwr_bms_dc',
    name: 'BMS & DC-DC Power Module',
    shortLabel: 'POWER MANAGEMENT',
    shortDesc: 'Protects the battery and steps down voltage for the ESP32 and sensors.',
    category: 'POWER',
    parent: 'Power Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [-0.82, -0.26, 0.52],
    purpose: 'Protects against over-current/under-voltage faults and steps down primary battery voltage to regulated low-voltage DC for the ESP32 and sensors.',
    interactions: 'Separates the high-current compressor power path from the sensitive logic power path.',
    connections: { mechanical: 'Standoff-mounted inside protected electrical bay.', thermal: 'Passive aluminum heatsink fins.', electrical: 'Splits Battery Bus into High-Power Refrigeration Bus and Regulated Logic Bus.' },
    engineeringNote: 'Fuse ratings, wire gauges, and inrush surge suppression require electrical validation.'
  },
  {
    id: 'pwr_charge_port',
    name: 'External Charging Port',
    shortLabel: 'CHARGE PORT',
    shortDesc: 'Weatherproof receptacle for stationary charging and auxiliary solar input.',
    category: 'POWER',
    parent: 'Power Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-1.06, -0.20, 0.42],
    purpose: 'Provides weatherproof external plug-in receptacles for overnight depot charging and optional auxiliary solar input.',
    interactions: 'Feeds into the internal charge controller and BMS protection stage.',
    connections: { mechanical: 'Flange-mounted IP-rated hinged cap.', thermal: 'None.', electrical: 'Isolated charging input lines.' },
    engineeringNote: 'Primary energy replenishment is assumed to occur via stationary charging.'
  },

  // --- F. EMBEDDED ELECTRONICS & CONTROL ---
  {
    id: 'elec_enclosure',
    name: 'Sealed Electronics Enclosure',
    shortLabel: 'CONTROL BOX',
    shortDesc: 'Splash-resistant polymer housing protecting the carrier PCB and ESP32.',
    category: 'ELECTRONICS',
    parent: 'Electronics Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [-0.70, 0.22, 0.52],
    purpose: 'Protects the PCB, ESP32 controller, and sensor terminal blocks from rain, washdown splashes, and dust.',
    interactions: 'Mounted near the operator handle end of the module, isolated from hot condenser exhaust air.',
    connections: { mechanical: 'Gasketed polymer enclosure on standoffs.', thermal: 'Shaded from direct sun.', electrical: 'Waterproof cable glands at bottom face.' },
    engineeringNote: 'Non-metallic housing permits Bluetooth Low Energy signal propagation.'
  },
  {
    id: 'elec_pcb',
    name: 'Control Interface Carrier PCB',
    shortLabel: 'CARRIER PCB',
    shortDesc: 'Routes sensor inputs and isolated control signals to the compressor driver.',
    category: 'ELECTRONICS',
    parent: 'Electronics Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-0.88, 0.32, 0.72],
    purpose: 'Provides screw terminals, opto-isolated control outputs, voltage conditioning, and headers for the ESP32 module.',
    interactions: 'Translates low-level logic signals from the ESP32 into control signals for the Compressor Driver Module.',
    connections: { mechanical: 'Mounted on standoffs inside Electronics Enclosure.', thermal: 'Low power dissipation.', electrical: 'Interfaces ESP32 with sensors, display, and compressor driver.' },
    engineeringNote: 'Safety boundary: logic signals are isolated from high-current motor lines.'
  },
  {
    id: 'elec_esp32',
    name: 'ESP32 Controller Board',
    shortLabel: 'ESP32 CONTROLLER',
    labelNum: '08',
    labelSide: 'left',
    shortDesc: 'Reads sensors and runs local autonomous cooling control logic.',
    category: 'ELECTRONICS',
    parent: 'Electronics Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [-1.08, 0.42, 0.92],
    purpose: 'Executes autonomous local thermostat control logic, reads chamber sensors, updates the local display, and broadcasts BLE telemetry.',
    interactions: 'Operates 100% locally for cooling control—never depends on internet, cloud connectivity, or the mobile app to maintain produce temperature.',
    connections: { mechanical: 'Socketed onto Carrier PCB inside Electronics Enclosure.', thermal: 'Within ambient rating.', electrical: 'Regulated DC input; sensor buses; BLE antenna.' },
    engineeringNote: 'The ESP32 does NOT drive the compressor motor directly through a GPIO pin; it signals the dedicated compressor driver.'
  },
  {
    id: 'elec_display',
    name: 'External Local Status Display',
    shortLabel: 'LOCAL DISPLAY',
    shortDesc: 'Shows real-time chamber temperature and battery state directly on the cart.',
    category: 'ELECTRONICS',
    parent: 'Electronics Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [-0.88, 0.62, 0.72],
    purpose: 'Displays real-time compartment temperature, cooling setpoint, and battery status directly to the vendor.',
    interactions: 'Allows the street vendor to operate and verify the cooler without needing a smartphone.',
    connections: { mechanical: 'Recessed protective bezel facing operator handle.', thermal: 'Protected from overhead glare.', electrical: 'Data ribbon harness to Carrier PCB.' },
    engineeringNote: 'Essential for offline usability; vendors have immediate visual confirmation of chamber status.'
  },
  {
    id: 'elec_harness',
    name: 'Protected Cable Harness',
    shortLabel: 'WIRING HARNESS',
    shortDesc: 'Armored power and shielded sensor conduits routed with clips along the frame.',
    category: 'ELECTRONICS',
    parent: 'Electronics Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [-0.50, 0.04, 0.48],
    purpose: 'Routes power and low-voltage sensor cables through chafe-protected conduits along the mounting frame.',
    interactions: 'Physically separates high-current DC motor wiring from low-voltage sensor signal lines.',
    connections: { mechanical: 'Clamped to mounting rails with saddle clips.', thermal: 'Rated for ambient heat.', electrical: 'Links Battery, BMS, Controller, Sensors, and Compressor.' },
    engineeringNote: 'Drip loops and strain reliefs required at every enclosure entry.'
  },

  // --- G. SENSORS ---
  {
    id: 'sens_temp',
    name: 'Internal Sensor Assembly',
    shortLabel: 'SENSOR ASSEMBLY',
    labelNum: '09',
    labelSide: 'right',
    shortDesc: 'Measures chamber air temperature for closed-loop local thermostat control.',
    category: 'SENSORS',
    parent: 'Sensor Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [0.46, 1.00, -0.26],
    purpose: 'Measures actual air temperature inside the insulated produce storage chamber for closed-loop local thermostat control.',
    interactions: 'Mounted inside a protective perforated guard on the inner liner wall, spaced away from direct contact with the evaporator plate.',
    connections: { mechanical: 'Sealed stainless-steel probe in thermal clip.', thermal: 'Senses representative chamber air temperature.', electrical: 'Shielded cable to Carrier PCB.' },
    engineeringNote: 'Placement avoids false rapid cycling caused by direct evaporator surface contact.'
  },
  {
    id: 'sens_humidity',
    name: 'Optional Humidity Sensor',
    shortLabel: 'HUMIDITY SENSOR',
    shortDesc: 'Monitors chamber relative humidity to help reduce produce moisture loss.',
    category: 'SENSORS',
    parent: 'Sensor Assembly',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0.62, 1.04, 0.25],
    purpose: 'Monitors interior relative humidity to assess produce dehydration risk and condensation conditions.',
    interactions: 'Reports telemetry to the ESP32 for local logging and mobile app display.',
    connections: { mechanical: 'Ventilated sensor cap inside liner.', thermal: 'Co-located in storage chamber.', electrical: 'Digital bus connection to ESP32.' },
    engineeringNote: 'Optional sensor module—not mandatory for basic thermostat closed-loop refrigeration control.'
  },
  {
    id: 'sens_battery',
    name: 'Battery Telemetry Sensor',
    shortLabel: 'VOLTAGE SENSOR',
    shortDesc: 'Monitors battery voltage and current to warn of low charge states.',
    category: 'SENSORS',
    parent: 'Sensor Assembly',
    status: 'DESIGN INTENT',
    basePos: [0, 0, 0],
    explodeVec: [-0.72, -0.35, 0.78],
    purpose: 'Measures battery terminal voltage and discharge status to warn the vendor of low battery.',
    interactions: 'Feeds telemetry to the ESP32 and local status screen; coordinates with hardware BMS low-voltage cutoff.',
    connections: { mechanical: 'Integrated within Power Management enclosure.', thermal: 'Monitors shunt temperature.', electrical: 'Sense lines to Carrier PCB.' },
    engineeringNote: 'Hardware BMS cutoff remains the primary safety backstop.'
  },

  // --- H. OPTIONAL SOLAR ACCESSORY ---
  {
    id: 'solar_panel',
    name: 'Optional Auxiliary Solar Canopy',
    shortLabel: 'SOLAR CANOPY',
    optional: true,
    shortDesc: 'Optional overhead PV module providing shade and supplemental trickle charging.',
    category: 'SOLAR',
    parent: 'Optional Accessories',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0, 0.72, 0],
    purpose: 'Provides supplemental auxiliary DC charging when parked in sunlit areas while shading the insulated storage compartment below.',
    interactions: 'Connects via the Charge Controller to the Battery Pack; shading the lid also passively reduces solar thermal load on the cold box.',
    connections: { mechanical: 'Bolted to telescoping tubular canopy struts.', thermal: 'Acts as an overhead sunshade for the cart.', electrical: 'Weatherproof lead to Charge Controller.' },
    engineeringNote: 'Presented strictly as an optional auxiliary charging concept—not claimed to power active refrigeration alone.'
  },
  {
    id: 'solar_mounts',
    name: 'Detachable Canopy Support Frame',
    shortLabel: 'CANOPY STRUTS',
    optional: true,
    shortDesc: 'Tubular corner stanchions supporting the optional overhead solar module.',
    category: 'SOLAR',
    parent: 'Optional Accessories',
    status: 'PROVISIONAL DESIGN',
    basePos: [0, 0, 0],
    explodeVec: [0, 0.48, -0.45],
    purpose: 'Supports the overhead solar panel above the compartment lid swing arc.',
    interactions: 'Clamps to the corner uprights of the Mounting Assembly and can be omitted for compact indoor/covered market carts.',
    connections: { mechanical: 'Tubular metal corner stanchions.', thermal: 'Passive airflow beneath panel.', electrical: 'Routes charging cable to Battery Enclosure.' },
    engineeringNote: 'Overhead clearance and wind stability require field validation.'
  }
];

// Curated 10 Primary Callout Labels shown when Exploded View is active
const EXPLODED_CALLOUT_LIST = COMPONENT_REGISTRY.filter(c => c.labelNum).sort(
  (a, b) => parseInt(a.labelNum, 10) - parseInt(b.labelNum, 10)
);

// ============================================================================
// 1B. PROCEDURAL TEXTURES & INDUSTRIAL HARDWARE HELPERS
// ============================================================================
function createLocalDisplayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep OLED industrial green-black background
  ctx.fillStyle = '#071712';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle internal bezel hairline
  ctx.strokeStyle = '#133829';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 236);

  // Top status bar
  ctx.fillStyle = '#10b981';
  ctx.font = '600 19px Inter, system-ui, sans-serif';
  ctx.fillText('COOLCART LOCAL CONTROL', 28, 44);

  // Battery indicator pill (right side)
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.strokeRect(418, 25, 54, 24);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(472, 31, 5, 12);
  ctx.fillRect(423, 30, 13, 14);
  ctx.fillRect(439, 30, 13, 14);
  ctx.fillRect(455, 30, 12, 14);

  // Divider line
  ctx.strokeStyle = '#113024';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(28, 62);
  ctx.lineTo(484, 62);
  ctx.stroke();

  // Main Chamber Readout
  ctx.fillStyle = '#ecfdf5';
  ctx.font = '700 84px Inter, system-ui, sans-serif';
  ctx.fillText('8.4°C', 26, 158);

  // Right column status pills
  ctx.fillStyle = '#0d2b20';
  ctx.fillRect(305, 86, 178, 42);
  ctx.fillStyle = '#34d399';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillText('● COOLING ACTIVE', 320, 113);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '500 18px Inter, system-ui, sans-serif';
  ctx.fillText('MODE: AUTONOMOUS', 306, 162);

  // Bottom telemetry bar
  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 17px monospace';
  ctx.fillText('CHAMBER RH: 82%   |   LOCAL LOOP: OK', 28, 222);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSolarCellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep monocrystalline silicon navy
  ctx.fillStyle = '#0d182e';
  ctx.fillRect(0, 0, 512, 256);

  const cols = 12;
  const rows = 6;
  const cw = 512 / cols;
  const ch = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * ch;
      ctx.fillStyle = (r + c) % 2 === 0 ? '#101f3c' : '#0e1b35';
      ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);

      // Fine silver busbars
      ctx.fillStyle = 'rgba(203, 213, 225, 0.28)';
      ctx.fillRect(x + cw * 0.3, y + 2, 1, ch - 4);
      ctx.fillRect(x + cw * 0.7, y + 2, 1, ch - 4);
    }
  }

  // White backsheet cell grid lines
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, 256);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * ch);
    ctx.lineTo(512, r * ch);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createWoodPlankTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6e472b';
  ctx.fillRect(0, 0, 512, 128);

  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(42, 24, 12, 0.14)' : 'rgba(145, 98, 60, 0.12)';
    const y = Math.random() * 128;
    const h = 1 + Math.random() * 3;
    ctx.fillRect(0, y, 512, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================================
// 2. PROCEDURAL 3D CAD SCENE BUILDER (PHYSICAL PROTOTYPE GEOMETRY)
// ============================================================================
function buildCoolCartCADScene(scene) {
  const componentGroups = {};
  const interactiveMeshes = [];
  const insulationMeshes = [];
  const outerShellMeshes = [];
  const coolingFlowParticles = [];
  const lidSubLayers = [];
  const explodeGuideLines = [];

  const displayTex = createLocalDisplayTexture();
  const solarTex = createSolarCellTexture();
  const woodTex = createWoodPlankTexture();

  // Physically-Based Materials (Studio Industrial Prototype Finish)
  const mats = {
    cartSteel: new THREE.MeshStandardMaterial({ color: 0x2f3237, roughness: 0.48, metalness: 0.72 }),
    cartWood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.76, metalness: 0.04 }),
    wheelRubber: new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.86, metalness: 0.06 }),
    mountGreen: new THREE.MeshStandardMaterial({ color: 0x24422e, roughness: 0.38, metalness: 0.48 }),
    steelFastener: new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.22, metalness: 0.90 }),
    brushedAlum: new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.28, metalness: 0.84 }),
    elastomerPad: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88, metalness: 0.05 }),
    outerHousing: new THREE.MeshPhysicalMaterial({
      color: 0xefeee8,
      roughness: 0.32,
      metalness: 0.08,
      clearcoat: 0.15,
      clearcoatRoughness: 0.35,
      transparent: true,
      opacity: 1.0
    }),
    seamTrim: new THREE.MeshStandardMaterial({ color: 0xcbd0d6, roughness: 0.42, metalness: 0.35, transparent: true, opacity: 1.0 }),
    insulationFoam: new THREE.MeshStandardMaterial({ color: 0xf7d774, roughness: 0.82, metalness: 0.0, transparent: true, opacity: 0.96 }),
    innerLiner: new THREE.MeshPhysicalMaterial({
      color: 0xe6f4ea,
      roughness: 0.22,
      metalness: 0.06,
      clearcoat: 0.25,
      transparent: true,
      opacity: 1.0
    }),
    gasketRubber: new THREE.MeshStandardMaterial({ color: 0x232326, roughness: 0.78, metalness: 0.05 }),
    compressorBody: new THREE.MeshStandardMaterial({ color: 0x182232, roughness: 0.32, metalness: 0.82 }),
    aluminumFins: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.26, metalness: 0.88 }),
    copperTube: new THREE.MeshStandardMaterial({ color: 0xc86d2d, roughness: 0.22, metalness: 0.90 }),
    brassFitting: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.26, metalness: 0.88 }),
    evapPlate: new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.26, metalness: 0.82 }),
    shroudMetal: new THREE.MeshStandardMaterial({ color: 0xe4e3de, roughness: 0.36, metalness: 0.38, transparent: true, opacity: 1.0 }),
    batteryBox: new THREE.MeshStandardMaterial({ color: 0x2b333e, roughness: 0.44, metalness: 0.58, transparent: true, opacity: 1.0 }),
    batteryPack: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.36, metalness: 0.45 }),
    batteryAccent: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.3 }),
    bmsModule: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.34, metalness: 0.58 }),
    polymerBox: new THREE.MeshStandardMaterial({ color: 0xd6d4ce, roughness: 0.36, metalness: 0.10, transparent: true, opacity: 1.0 }),
    pcbGreen: new THREE.MeshStandardMaterial({ color: 0x0f5132, roughness: 0.30, metalness: 0.35 }),
    esp32Dark: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.28, metalness: 0.55 }),
    goldPin: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.22, metalness: 0.92 }),
    displayScreen: new THREE.MeshStandardMaterial({
      map: displayTex,
      emissive: 0x10b981,
      emissiveMap: displayTex,
      emissiveIntensity: 0.45,
      roughness: 0.22,
      metalness: 0.05
    }),
    displayGlass: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.65,
      transparent: true,
      opacity: 0.35
    }),
    sensorSteel: new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.20, metalness: 0.92 }),
    sensorAccent: new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.35, metalness: 0.45 }),
    solarSurface: new THREE.MeshPhysicalMaterial({
      map: solarTex,
      roughness: 0.16,
      metalness: 0.25,
      clearcoat: 0.65,
      clearcoatRoughness: 0.15
    }),
    solarFrame: new THREE.MeshStandardMaterial({ color: 0xbec3c9, roughness: 0.30, metalness: 0.85 }),
    harnessBlack: new THREE.MeshStandardMaterial({ color: 0x1f2023, roughness: 0.68, metalness: 0.18 })
  };

  const createCompGroup = (compId) => {
    const group = new THREE.Group();
    group.name = compId;
    group.userData = { compId };
    scene.add(group);
    componentGroups[compId] = group;
    return group;
  };

  const addPartMesh = (group, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) => {
    const clonedMat = mat.clone();
    const mesh = new THREE.Mesh(geo, clonedMat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      compId: group.userData.compId,
      baseColor: clonedMat.color ? clonedMat.color.getHex() : 0xffffff,
      baseEmissive: clonedMat.emissive ? clonedMat.emissive.getHex() : 0x000000,
      baseEmissiveIntensity: clonedMat.emissiveIntensity || 0,
      baseOpacity: clonedMat.opacity !== undefined ? clonedMat.opacity : 1.0,
      isOuterHousing: !!opts.isOuterHousing,
      isInsulation: !!opts.isInsulation,
      cutawayPanel: !!opts.cutawayPanel
    };
    group.add(mesh);
    interactiveMeshes.push(mesh);
    if (opts.isOuterHousing) outerShellMeshes.push(mesh);
    if (opts.isInsulation) insulationMeshes.push(mesh);
    return mesh;
  };

  // Reusable Hex Bolt + Washer Helper
  const hexHeadGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.008, 6);
  const washerGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.003, 14);
  const addHexBolt = (group, pos, rot = [0, 0, 0]) => {
    addPartMesh(group, washerGeo, mats.steelFastener, pos, rot);
    addPartMesh(
      group,
      hexHeadGeo,
      mats.steelFastener,
      [pos[0], pos[1] + 0.005, pos[2]],
      rot
    );
  };

  // Reusable 3D Routed Pipe / Cable Helper
  const addRoutedTube = (group, pts, radius, mat, tubularSegments = 28, opts = {}) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
    return addPartMesh(group, geo, mat, [0, 0, 0], [0, 0, 0], [1, 1, 1], opts);
  };

  // -------------------------------------------------------------------------
  // A. CART ASSEMBLY (Fabricated Tubular & Angle-Iron Vendor Pushcart)
  // -------------------------------------------------------------------------
  const gCartFrame = createCompGroup('cart_frame');
  addPartMesh(gCartFrame, new THREE.BoxGeometry(1.96, 0.062, 0.058), mats.cartSteel, [0, 0.62, 0.55]);
  addPartMesh(gCartFrame, new THREE.BoxGeometry(1.96, 0.062, 0.058), mats.cartSteel, [0, 0.62, -0.55]);
  addPartMesh(gCartFrame, new THREE.BoxGeometry(0.058, 0.062, 1.16), mats.cartSteel, [0.95, 0.62, 0]);
  addPartMesh(gCartFrame, new THREE.BoxGeometry(0.058, 0.062, 1.16), mats.cartSteel, [-0.95, 0.62, 0]);
  [[-0.91, 0.51], [0.91, 0.51], [-0.91, -0.51], [0.91, -0.51]].forEach(([cx, cz]) => {
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.14, 0.066, 0.14), mats.cartSteel, [cx, 0.62, cz]);
    addHexBolt(gCartFrame, [cx, 0.654, cz]);
  });
  [-0.65, -0.22, 0.22, 0.65].forEach((tx) => {
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.045, 0.045, 1.08), mats.cartSteel, [tx, 0.595, 0]);
  });
  for (let i = -3; i <= 3; i++) {
    const pz = i * 0.148;
    addPartMesh(gCartFrame, new THREE.BoxGeometry(1.86, 0.028, 0.136), mats.cartWood, [0, 0.642, pz]);
    addHexBolt(gCartFrame, [-0.65, 0.656, pz]);
    addHexBolt(gCartFrame, [0.65, 0.656, pz]);
  }
  [[-0.72, 0.48], [0.72, 0.48], [-0.72, -0.48], [0.72, -0.48]].forEach(([x, z]) => {
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.055, 0.30, 0.055), mats.cartSteel, [x, 0.45, z]);
    addPartMesh(gCartFrame, new THREE.CylinderGeometry(0.014, 0.014, 0.32, 10), mats.cartSteel, [x + (x > 0 ? -0.11 : 0.11), 0.48, z], [0, 0, x > 0 ? 0.52 : -0.52]);
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.42, 0.016, 0.048), mats.cartSteel, [x, 0.34, z]);
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.30, 0.016, 0.048), mats.cartSteel, [x, 0.322, z]);
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.18, 0.016, 0.048), mats.cartSteel, [x, 0.304, z]);
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.075, 0.065, 0.075), mats.steelFastener, [x, 0.295, z]);
  });
  addPartMesh(gCartFrame, new THREE.BoxGeometry(1.90, 0.058, 0.026), mats.cartWood, [0, 0.725, 0.562]);
  addPartMesh(gCartFrame, new THREE.BoxGeometry(1.90, 0.058, 0.026), mats.cartWood, [0, 0.725, -0.562]);
  addPartMesh(gCartFrame, new THREE.BoxGeometry(0.026, 0.058, 1.14), mats.cartWood, [0.955, 0.725, 0]);
  [[-0.92, 0.56], [0, 0.56], [0.92, 0.56], [-0.92, -0.56], [0, -0.56], [0.92, -0.56]].forEach(([px, pz]) => {
    addPartMesh(gCartFrame, new THREE.BoxGeometry(0.032, 0.11, 0.032), mats.cartSteel, [px, 0.70, pz]);
  });

  const gCartWheels = createCompGroup('cart_wheels');
  addPartMesh(gCartWheels, new THREE.CylinderGeometry(0.024, 0.024, 1.40, 18), mats.cartSteel, [-0.72, 0.28, 0], [Math.PI / 2, 0, 0]);
  addPartMesh(gCartWheels, new THREE.CylinderGeometry(0.024, 0.024, 1.40, 18), mats.cartSteel, [0.72, 0.28, 0], [Math.PI / 2, 0, 0]);
  [[-0.72, 0.64], [0.72, 0.64], [-0.72, -0.64], [0.72, -0.64]].forEach(([wx, wz]) => {
    addPartMesh(gCartWheels, new THREE.TorusGeometry(0.255, 0.044, 18, 40), mats.wheelRubber, [wx, 0.28, wz]);
    for (let t = 0; t < 24; t++) {
      const ang = (t * Math.PI * 2) / 24;
      addPartMesh(
        gCartWheels,
        new THREE.BoxGeometry(0.022, 0.014, 0.068),
        mats.wheelRubber,
        [wx + Math.cos(ang) * 0.292, 0.28 + Math.sin(ang) * 0.292, wz],
        [0, 0, ang]
      );
    }
    addPartMesh(gCartWheels, new THREE.TorusGeometry(0.212, 0.018, 14, 32), mats.cartSteel, [wx, 0.28, wz]);
    addPartMesh(gCartWheels, new THREE.CylinderGeometry(0.058, 0.058, 0.10, 18), mats.cartSteel, [wx, 0.28, wz], [Math.PI / 2, 0, 0]);
    addPartMesh(gCartWheels, new THREE.CylinderGeometry(0.034, 0.034, 0.125, 16), mats.steelFastener, [wx, 0.28, wz], [Math.PI / 2, 0, 0]);
    for (let s = 0; s < 10; s++) {
      addPartMesh(
        gCartWheels,
        new THREE.CylinderGeometry(0.0085, 0.0085, 0.42, 8),
        mats.steelFastener,
        [wx, 0.28, wz],
        [0, 0, (s * Math.PI) / 10]
      );
    }
  });

  const gCartHandle = createCompGroup('cart_handle');
  addRoutedTube(gCartHandle, [[-0.95, 0.64, 0.48], [-1.12, 0.76, 0.48], [-1.29, 0.90, 0.48]], 0.021, mats.cartSteel, 16);
  addRoutedTube(gCartHandle, [[-0.95, 0.64, -0.48], [-1.12, 0.76, -0.48], [-1.29, 0.90, -0.48]], 0.021, mats.cartSteel, 16);
  addPartMesh(gCartHandle, new THREE.BoxGeometry(0.06, 0.09, 0.08), mats.cartSteel, [-0.95, 0.65, 0.48]);
  addPartMesh(gCartHandle, new THREE.BoxGeometry(0.06, 0.09, 0.08), mats.cartSteel, [-0.95, 0.65, -0.48]);
  addPartMesh(gCartHandle, new THREE.CylinderGeometry(0.022, 0.022, 1.08, 18), mats.cartSteel, [-1.29, 0.90, 0], [Math.PI / 2, 0, 0]);
  addPartMesh(gCartHandle, new THREE.CylinderGeometry(0.027, 0.027, 0.28, 16), mats.elastomerPad, [-1.29, 0.90, 0.34], [Math.PI / 2, 0, 0]);
  addPartMesh(gCartHandle, new THREE.CylinderGeometry(0.027, 0.027, 0.28, 16), mats.elastomerPad, [-1.29, 0.90, -0.34], [Math.PI / 2, 0, 0]);

  // -------------------------------------------------------------------------
  // B. MOUNTING ASSEMBLY
  // -------------------------------------------------------------------------
  const gMountRails = createCompGroup('mount_rails');
  [-0.38, 0, 0.38].forEach((rz) => {
    addPartMesh(gMountRails, new THREE.BoxGeometry(1.80, 0.046, 0.078), mats.mountGreen, [0, 0.68, rz]);
    addPartMesh(gMountRails, new THREE.BoxGeometry(1.82, 0.008, 0.096), mats.mountGreen, [0, 0.703, rz]);
    for (let s = -4; s <= 4; s++) {
      addPartMesh(gMountRails, new THREE.BoxGeometry(0.065, 0.012, 0.024), mats.elastomerPad, [s * 0.18, 0.704, rz]);
    }
  });
  [-0.78, -0.22, 0.25, 0.78].forEach((rx) => {
    addPartMesh(gMountRails, new THREE.BoxGeometry(0.078, 0.038, 0.96), mats.mountGreen, [rx, 0.70, 0]);
    addHexBolt(gMountRails, [rx, 0.72, 0.38]);
    addHexBolt(gMountRails, [rx, 0.72, -0.38]);
  });

  const gMountBrackets = createCompGroup('mount_brackets');
  [[-0.78, 0.54], [0.05, 0.54], [0.78, 0.54], [-0.78, -0.54], [0.05, -0.54], [0.78, -0.54]].forEach(([bx, bz]) => {
    addPartMesh(gMountBrackets, new THREE.BoxGeometry(0.105, 0.125, 0.058), mats.mountGreen, [bx, 0.652, bz]);
    addPartMesh(gMountBrackets, new THREE.BoxGeometry(0.105, 0.028, 0.095), mats.mountGreen, [bx, 0.585, bz + (bz > 0 ? -0.02 : 0.02)]);
    addPartMesh(gMountBrackets, new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), mats.steelFastener, [bx - 0.026, 0.67, bz]);
    addPartMesh(gMountBrackets, new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), mats.steelFastener, [bx + 0.026, 0.67, bz]);
  });

  const gMountIsolators = createCompGroup('mount_isolators');
  [
    [-0.75, 0.38], [-0.35, 0.38], [0.1, 0.38], [0.75, 0.38],
    [-0.75, -0.38], [-0.35, -0.38], [0.1, -0.38], [0.75, -0.38]
  ].forEach(([ix, iz]) => {
    addPartMesh(gMountIsolators, new THREE.CylinderGeometry(0.048, 0.052, 0.010, 20), mats.steelFastener, [ix, 0.708, iz]);
    addPartMesh(gMountIsolators, new THREE.CylinderGeometry(0.044, 0.048, 0.032, 20), mats.elastomerPad, [ix, 0.724, iz]);
    addPartMesh(gMountIsolators, new THREE.TorusGeometry(0.045, 0.006, 10, 20), mats.elastomerPad, [ix, 0.724, iz], [Math.PI / 2, 0, 0]);
    addPartMesh(gMountIsolators, new THREE.CylinderGeometry(0.044, 0.044, 0.008, 20), mats.steelFastener, [ix, 0.742, iz]);
    addHexBolt(gMountIsolators, [ix, 0.746, iz]);
  });

  // -------------------------------------------------------------------------
  // C. INSULATED STORAGE COMPARTMENT
  // -------------------------------------------------------------------------
  const boxCenterX = 0.32;
  const boxCenterY = 1.12;
  const gStorageOuter = createCompGroup('storage_outer');
  addPartMesh(gStorageOuter, new THREE.BoxGeometry(1.12, 0.034, 0.96), mats.outerHousing, [boxCenterX, 0.752, 0]);
  addPartMesh(gStorageOuter, new THREE.BoxGeometry(1.12, 0.72, 0.032), mats.outerHousing, [boxCenterX, boxCenterY, 0.465], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gStorageOuter, new THREE.BoxGeometry(1.12, 0.72, 0.032), mats.outerHousing, [boxCenterX, boxCenterY, -0.465], [0, 0, 0], [1, 1, 1], { isOuterHousing: true });
  addPartMesh(gStorageOuter, new THREE.BoxGeometry(0.032, 0.72, 0.90), mats.outerHousing, [boxCenterX + 0.545, boxCenterY, 0], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gStorageOuter, new THREE.BoxGeometry(0.036, 0.72, 0.90), mats.outerHousing, [boxCenterX - 0.545, boxCenterY, 0], [0, 0, 0], [1, 1, 1], { isOuterHousing: true });
  [[-0.548, 0.468, true], [0.548, 0.468, true], [-0.548, -0.468, false], [0.548, -0.468, false]].forEach(([cx, cz, isFront]) => {
    addPartMesh(
      gStorageOuter,
      new THREE.CylinderGeometry(0.026, 0.026, 0.725, 16),
      mats.seamTrim,
      [boxCenterX + cx, boxCenterY, cz],
      [0, 0, 0],
      [1, 1, 1],
      { isOuterHousing: true, cutawayPanel: isFront }
    );
    addPartMesh(
      gStorageOuter,
      new THREE.BoxGeometry(0.068, 0.075, 0.068),
      mats.elastomerPad,
      [boxCenterX + cx * 0.97, 0.775, cz * 0.97],
      [0, 0, 0],
      [1, 1, 1],
      { isOuterHousing: true, cutawayPanel: isFront }
    );
  });
  addPartMesh(gStorageOuter, new THREE.BoxGeometry(1.13, 0.028, 0.97), mats.seamTrim, [boxCenterX, 1.468, 0], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });

  const gStorageInsul = createCompGroup('storage_insulation');
  addPartMesh(gStorageInsul, new THREE.BoxGeometry(1.05, 0.052, 0.89), mats.insulationFoam, [boxCenterX, 0.79, 0], [0, 0, 0], [1, 1, 1], { isInsulation: true });
  addPartMesh(gStorageInsul, new THREE.BoxGeometry(1.04, 0.64, 0.052), mats.insulationFoam, [boxCenterX, boxCenterY + 0.01, 0.420], [0, 0, 0], [1, 1, 1], { isInsulation: true, cutawayPanel: true });
  addPartMesh(gStorageInsul, new THREE.BoxGeometry(1.04, 0.64, 0.052), mats.insulationFoam, [boxCenterX, boxCenterY + 0.01, -0.420], [0, 0, 0], [1, 1, 1], { isInsulation: true });
  addPartMesh(gStorageInsul, new THREE.BoxGeometry(0.052, 0.64, 0.78), mats.insulationFoam, [boxCenterX + 0.500, boxCenterY + 0.01, 0], [0, 0, 0], [1, 1, 1], { isInsulation: true, cutawayPanel: true });
  addPartMesh(gStorageInsul, new THREE.BoxGeometry(0.074, 0.64, 0.78), mats.insulationFoam, [boxCenterX - 0.490, boxCenterY + 0.01, 0], [0, 0, 0], [1, 1, 1], { isInsulation: true });
  [[-0.50, 0.40, true], [0.50, 0.40, true], [-0.50, -0.40, false], [0.50, -0.40, false]].forEach(([ix, iz, isFront]) => {
    addPartMesh(gStorageInsul, new THREE.BoxGeometry(0.022, 0.645, 0.022), mats.seamTrim, [boxCenterX + ix, boxCenterY + 0.01, iz], [0, 0, 0], [1, 1, 1], { isInsulation: true, cutawayPanel: isFront });
  });

  const gStorageLiner = createCompGroup('storage_liner');
  addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.93, 0.022, 0.78), mats.innerLiner, [boxCenterX + 0.01, 0.83, 0]);
  addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.93, 0.61, 0.022), mats.innerLiner, [boxCenterX + 0.01, boxCenterY + 0.02, 0.38], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.93, 0.61, 0.022), mats.innerLiner, [boxCenterX + 0.01, boxCenterY + 0.02, -0.38]);
  addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.022, 0.61, 0.74), mats.innerLiner, [boxCenterX + 0.465, boxCenterY + 0.02, 0], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.022, 0.61, 0.74), mats.innerLiner, [boxCenterX - 0.445, boxCenterY + 0.02, 0]);
  [[-0.43, 0.34], [-0.43, -0.34], [0.44, -0.34]].forEach(([lx, lz]) => {
    addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.024, 0.56, 0.024), mats.seamTrim, [boxCenterX + lx, boxCenterY + 0.02, lz]);
  });
  for (let r = -3; r <= 3; r++) {
    addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.84, 0.012, 0.025), mats.innerLiner, [boxCenterX + 0.02, 0.845, r * 0.095]);
    addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.82, 0.014, 0.042), mats.innerLiner, [boxCenterX + 0.04, 1.02, r * 0.095]);
  }
  addPartMesh(gStorageLiner, new THREE.BoxGeometry(0.018, 0.48, 0.72), mats.innerLiner, [boxCenterX + 0.08, 1.09, 0]);

  const gStorageGasket = createCompGroup('storage_gasket');
  addPartMesh(gStorageGasket, new THREE.BoxGeometry(1.10, 0.024, 0.044), mats.gasketRubber, [boxCenterX, 1.484, 0.452]);
  addPartMesh(gStorageGasket, new THREE.BoxGeometry(1.10, 0.024, 0.044), mats.gasketRubber, [boxCenterX, 1.484, -0.452]);
  addPartMesh(gStorageGasket, new THREE.BoxGeometry(0.044, 0.024, 0.86), mats.gasketRubber, [boxCenterX + 0.53, 1.484, 0]);
  addPartMesh(gStorageGasket, new THREE.BoxGeometry(0.044, 0.024, 0.86), mats.gasketRubber, [boxCenterX - 0.53, 1.484, 0]);

  const gStorageLid = createCompGroup('storage_lid');
  const lidInnerLiner = addPartMesh(
    gStorageLid,
    new THREE.BoxGeometry(0.96, 0.016, 0.80),
    mats.innerLiner,
    [boxCenterX, 1.498, 0],
    [0, 0, 0],
    [1, 1, 1],
    { isOuterHousing: true, cutawayPanel: true }
  );
  lidSubLayers.push({ mesh: lidInnerLiner, baseY: 1.498, explodeOffsetY: -0.14 });

  const lidFoamCore = addPartMesh(
    gStorageLid,
    new THREE.BoxGeometry(1.03, 0.034, 0.87),
    mats.insulationFoam,
    [boxCenterX, 1.518, 0],
    [0, 0, 0],
    [1, 1, 1],
    { isInsulation: true, cutawayPanel: true }
  );
  lidSubLayers.push({ mesh: lidFoamCore, baseY: 1.518, explodeOffsetY: 0.0 });

  const lidOuterShell = addPartMesh(
    gStorageLid,
    new THREE.BoxGeometry(1.13, 0.044, 0.97),
    mats.outerHousing,
    [boxCenterX, 1.538, 0],
    [0, 0, 0],
    [1, 1, 1],
    { isOuterHousing: true, cutawayPanel: true }
  );
  const lidOuterCrown = addPartMesh(
    gStorageLid,
    new THREE.BoxGeometry(1.07, 0.016, 0.91),
    mats.outerHousing,
    [boxCenterX, 1.564, 0],
    [0, 0, 0],
    [1, 1, 1],
    { isOuterHousing: true, cutawayPanel: true }
  );
  const lidHandleBar = addPartMesh(gStorageLid, new THREE.CylinderGeometry(0.014, 0.014, 0.34, 16), mats.mountGreen, [boxCenterX, 1.542, 0.525], [0, 0, Math.PI / 2]);
  const lidHandleStandoffL = addPartMesh(gStorageLid, new THREE.BoxGeometry(0.028, 0.026, 0.055), mats.steelFastener, [boxCenterX - 0.14, 1.542, 0.50]);
  const lidHandleStandoffR = addPartMesh(gStorageLid, new THREE.BoxGeometry(0.028, 0.026, 0.055), mats.steelFastener, [boxCenterX + 0.14, 1.542, 0.50]);
  lidSubLayers.push(
    { mesh: lidOuterShell, baseY: 1.538, explodeOffsetY: 0.14 },
    { mesh: lidOuterCrown, baseY: 1.564, explodeOffsetY: 0.14 },
    { mesh: lidHandleBar, baseY: 1.542, explodeOffsetY: 0.14 },
    { mesh: lidHandleStandoffL, baseY: 1.542, explodeOffsetY: 0.14 },
    { mesh: lidHandleStandoffR, baseY: 1.542, explodeOffsetY: 0.14 }
  );

  [-0.32, 0.32].forEach((lx) => {
    const latchBody = addPartMesh(gStorageLid, new THREE.BoxGeometry(0.050, 0.088, 0.034), mats.steelFastener, [boxCenterX + lx, 1.50, 0.492]);
    const latchToggle = addPartMesh(gStorageLid, new THREE.CylinderGeometry(0.016, 0.016, 0.056, 12), mats.batteryAccent, [boxCenterX + lx, 1.472, 0.502], [0, 0, Math.PI / 2]);
    lidSubLayers.push(
      { mesh: latchBody, baseY: 1.50, explodeOffsetY: 0.14 },
      { mesh: latchToggle, baseY: 1.472, explodeOffsetY: 0.14 }
    );
  });
  [-0.35, 0.35].forEach((hx) => {
    const hingePlate = addPartMesh(gStorageLid, new THREE.BoxGeometry(0.078, 0.086, 0.040), mats.steelFastener, [boxCenterX + hx, 1.50, -0.49]);
    const hingeBarrel = addPartMesh(gStorageLid, new THREE.CylinderGeometry(0.016, 0.016, 0.088, 14), mats.cartSteel, [boxCenterX + hx, 1.515, -0.505], [0, 0, Math.PI / 2]);
    lidSubLayers.push(
      { mesh: hingePlate, baseY: 1.50, explodeOffsetY: 0.14 },
      { mesh: hingeBarrel, baseY: 1.515, explodeOffsetY: 0.14 }
    );
  });

  const gStorageDrain = createCompGroup('storage_drain');
  addPartMesh(gStorageDrain, new THREE.CylinderGeometry(0.038, 0.024, 0.08, 18), mats.steelFastener, [boxCenterX + 0.32, 0.74, -0.28]);
  addPartMesh(gStorageDrain, new THREE.CylinderGeometry(0.022, 0.022, 0.045, 14), mats.brassFitting, [boxCenterX + 0.32, 0.68, -0.28]);
  addPartMesh(gStorageDrain, new THREE.BoxGeometry(0.065, 0.014, 0.018), mats.batteryAccent, [boxCenterX + 0.34, 0.68, -0.26]);
  addRoutedTube(
    gStorageDrain,
    [[boxCenterX + 0.32, 0.66, -0.28], [boxCenterX + 0.32, 0.56, -0.30], [boxCenterX + 0.32, 0.59, -0.36], [boxCenterX + 0.32, 0.46, -0.40]],
    0.015,
    mats.gasketRubber,
    20
  );

  // -------------------------------------------------------------------------
  // D. ACTIVE REFRIGERATION SYSTEM
  // -------------------------------------------------------------------------
  const gRefCompressor = createCompGroup('ref_compressor');
  addPartMesh(gRefCompressor, new THREE.CylinderGeometry(0.112, 0.115, 0.23, 28), mats.compressorBody, [-0.56, 1.07, -0.18]);
  addPartMesh(gRefCompressor, new THREE.TorusGeometry(0.114, 0.008, 12, 28), mats.compressorBody, [-0.56, 1.15, -0.18], [Math.PI / 2, 0, 0]);
  addPartMesh(gRefCompressor, new THREE.SphereGeometry(0.112, 24, 16), mats.compressorBody, [-0.56, 1.185, -0.18], [0, 0, 0], [1, 0.65, 1]);
  addPartMesh(gRefCompressor, new THREE.CylinderGeometry(0.036, 0.036, 0.17, 18), mats.compressorBody, [-0.45, 1.10, -0.08]);
  addPartMesh(gRefCompressor, new THREE.SphereGeometry(0.036, 14, 12), mats.compressorBody, [-0.45, 1.185, -0.08]);
  addPartMesh(gRefCompressor, new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), mats.copperTube, [-0.56, 1.26, -0.18]);
  addPartMesh(gRefCompressor, new THREE.CylinderGeometry(0.016, 0.016, 0.022, 6), mats.brassFitting, [-0.56, 1.27, -0.18]);
  addPartMesh(gRefCompressor, new THREE.BoxGeometry(0.28, 0.020, 0.28), mats.cartSteel, [-0.56, 0.945, -0.18]);
  [[-0.66, -0.08], [-0.46, -0.08], [-0.66, -0.28], [-0.46, -0.28]].forEach(([fx, fz]) => {
    addPartMesh(gRefCompressor, new THREE.CylinderGeometry(0.022, 0.026, 0.028, 14), mats.elastomerPad, [fx, 0.925, fz]);
    addHexBolt(gRefCompressor, [fx, 0.955, fz]);
  });
  addPartMesh(gRefCompressor, new THREE.BoxGeometry(0.082, 0.165, 0.145), mats.bmsModule, [-0.39, 1.05, -0.22]);
  for (let h = -3; h <= 3; h++) {
    addPartMesh(gRefCompressor, new THREE.BoxGeometry(0.018, 0.155, 0.006), mats.brushedAlum, [-0.342, 1.05, -0.22 + h * 0.018]);
  }

  const gRefCondenser = createCompGroup('ref_condenser');
  addPartMesh(gRefCondenser, new THREE.BoxGeometry(0.095, 0.38, 0.016), mats.cartSteel, [-0.74, 1.13, 0.335]);
  addPartMesh(gRefCondenser, new THREE.BoxGeometry(0.095, 0.38, 0.016), mats.cartSteel, [-0.74, 1.13, -0.095]);
  for (let f = -10; f <= 10; f++) {
    addPartMesh(gRefCondenser, new THREE.BoxGeometry(0.088, 0.005, 0.415), mats.aluminumFins, [-0.74, 1.13 + f * 0.017, 0.12]);
  }
  for (let r = -3; r <= 3; r++) {
    const ry = 1.13 + r * 0.046;
    addPartMesh(gRefCondenser, new THREE.CylinderGeometry(0.009, 0.009, 0.44, 10), mats.copperTube, [-0.71, ry, 0.12], [Math.PI / 2, 0, 0]);
    addPartMesh(gRefCondenser, new THREE.TorusGeometry(0.023, 0.008, 10, 18, Math.PI), mats.copperTube, [-0.71, ry, 0.34], [0, Math.PI / 2, 0]);
  }

  const gRefFan = createCompGroup('ref_fan');
  addPartMesh(gRefFan, new THREE.BoxGeometry(0.032, 0.36, 0.38), mats.elastomerPad, [-0.80, 1.13, 0.12]);
  addPartMesh(gRefFan, new THREE.TorusGeometry(0.148, 0.016, 14, 32), mats.elastomerPad, [-0.815, 1.13, 0.12], [0, Math.PI / 2, 0]);
  addPartMesh(gRefFan, new THREE.CylinderGeometry(0.046, 0.046, 0.048, 20), mats.compressorBody, [-0.815, 1.13, 0.12], [0, 0, Math.PI / 2]);
  for (let b = 0; b < 7; b++) {
    const ang = (b * Math.PI * 2) / 7;
    addPartMesh(
      gRefFan,
      new THREE.BoxGeometry(0.008, 0.12, 0.036),
      mats.mountGreen,
      [-0.815, 1.13 + Math.cos(ang) * 0.085, 0.12 + Math.sin(ang) * 0.085],
      [ang + 0.35, 0.28, 0]
    );
  }
  [0.065, 0.105, 0.142].forEach((gr) => {
    addPartMesh(gRefFan, new THREE.TorusGeometry(gr, 0.003, 8, 28), mats.steelFastener, [-0.835, 1.13, 0.12], [0, Math.PI / 2, 0]);
  });

  const gRefExpansion = createCompGroup('ref_expansion');
  addPartMesh(gRefExpansion, new THREE.CylinderGeometry(0.024, 0.024, 0.13, 18), mats.copperTube, [-0.36, 1.21, 0.08]);
  addPartMesh(gRefExpansion, new THREE.SphereGeometry(0.024, 16, 12), mats.copperTube, [-0.36, 1.275, 0.08]);
  addPartMesh(gRefExpansion, new THREE.BoxGeometry(0.044, 0.044, 0.044), mats.brassFitting, [-0.36, 1.32, 0.08]);
  for (let c = 0; c < 5; c++) {
    addPartMesh(
      gRefExpansion,
      new THREE.TorusGeometry(0.026, 0.0045, 8, 20),
      mats.copperTube,
      [-0.30, 1.31 + c * 0.011, 0.08],
      [Math.PI / 2, 0, 0]
    );
  }

  const gRefEvaporator = createCompGroup('ref_evaporator');
  addPartMesh(gRefEvaporator, new THREE.BoxGeometry(0.018, 0.48, 0.66), mats.evapPlate, [-0.085, 1.14, 0]);
  for (let vf = -11; vf <= 11; vf++) {
    addPartMesh(gRefEvaporator, new THREE.BoxGeometry(0.026, 0.46, 0.004), mats.aluminumFins, [-0.072, 1.14, vf * 0.026]);
  }
  for (let c = -4; c <= 4; c++) {
    const cy = 1.14 + c * 0.048;
    addPartMesh(gRefEvaporator, new THREE.CylinderGeometry(0.009, 0.009, 0.60, 12), mats.copperTube, [-0.060, cy, 0], [Math.PI / 2, 0, 0]);
    if (c < 4) {
      addPartMesh(
        gRefEvaporator,
        new THREE.TorusGeometry(0.024, 0.0085, 8, 16, Math.PI),
        mats.copperTube,
        [-0.060, cy + 0.024, c % 2 === 0 ? 0.30 : -0.30],
        [0, Math.PI / 2, c % 2 === 0 ? 0 : Math.PI]
      );
    }
  }
  [[-0.07, 1.35, 0.28], [-0.07, 1.35, -0.28], [-0.07, 0.93, 0.28], [-0.07, 0.93, -0.28]].forEach((sp) => {
    addPartMesh(gRefEvaporator, new THREE.CylinderGeometry(0.008, 0.008, 0.038, 10), mats.steelFastener, sp, [0, 0, Math.PI / 2]);
  });

  const gRefTubing = createCompGroup('ref_tubing');
  addRoutedTube(
    gRefTubing,
    [[-0.56, 1.26, -0.18], [-0.56, 1.35, -0.16], [-0.71, 1.34, -0.02], [-0.71, 1.27, 0.08]],
    0.0095,
    mats.copperTube,
    28
  );
  addRoutedTube(
    gRefTubing,
    [[-0.71, 0.99, 0.14], [-0.54, 0.99, 0.14], [-0.36, 1.08, 0.08], [-0.36, 1.15, 0.08]],
    0.008,
    mats.copperTube,
    24
  );
  addRoutedTube(
    gRefTubing,
    [[-0.30, 1.36, 0.08], [-0.20, 1.36, 0.06], [-0.07, 1.34, 0.04]],
    0.008,
    mats.copperTube,
    20
  );
  addRoutedTube(
    gRefTubing,
    [[-0.07, 0.96, -0.16], [-0.24, 0.96, -0.18], [-0.38, 1.04, -0.14], [-0.45, 1.19, -0.08]],
    0.017,
    mats.elastomerPad,
    28
  );
  addPartMesh(gRefTubing, new THREE.CylinderGeometry(0.024, 0.024, 0.04, 16), mats.gasketRubber, [-0.22, 1.36, 0.06], [0, 0, Math.PI / 2]);
  addPartMesh(gRefTubing, new THREE.CylinderGeometry(0.032, 0.032, 0.04, 16), mats.gasketRubber, [-0.22, 0.96, -0.18], [0, 0, Math.PI / 2]);

  const gRefHousing = createCompGroup('ref_housing');
  addPartMesh(gRefHousing, new THREE.BoxGeometry(0.62, 0.026, 0.96), mats.shroudMetal, [-0.56, 1.47, 0], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gRefHousing, new THREE.BoxGeometry(0.62, 0.54, 0.026), mats.shroudMetal, [-0.56, 1.19, -0.465], [0, 0, 0], [1, 1, 1], { isOuterHousing: true });
  addPartMesh(gRefHousing, new THREE.BoxGeometry(0.026, 0.54, 0.92), mats.shroudMetal, [-0.86, 1.19, 0], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gRefHousing, new THREE.BoxGeometry(0.032, 0.42, 0.48), mats.cartSteel, [-0.865, 1.13, 0.12], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  for (let l = -3; l <= 3; l++) {
    addPartMesh(
      gRefHousing,
      new THREE.BoxGeometry(0.038, 0.016, 0.44),
      mats.shroudMetal,
      [-0.872, 1.13 + l * 0.052, 0.12],
      [0, 0, 0.35],
      [1, 1, 1],
      { isOuterHousing: true, cutawayPanel: true }
    );
  }
  [[-0.875, 1.42, 0.42], [-0.875, 1.42, -0.42], [-0.875, 0.96, 0.42], [-0.875, 0.96, -0.42]].forEach((bp) => {
    addPartMesh(gRefHousing, new THREE.CylinderGeometry(0.012, 0.012, 0.016, 6), mats.steelFastener, bp, [0, 0, Math.PI / 2], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  });

  // -------------------------------------------------------------------------
  // E. BATTERY & POWER MANAGEMENT
  // -------------------------------------------------------------------------
  const gPwrEnclosure = createCompGroup('pwr_enclosure');
  addPartMesh(gPwrEnclosure, new THREE.BoxGeometry(0.58, 0.19, 0.54), mats.batteryBox, [-0.56, 0.82, 0.18], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gPwrEnclosure, new THREE.BoxGeometry(0.54, 0.15, 0.018), mats.cartSteel, [-0.56, 0.82, 0.452], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gPwrEnclosure, new THREE.BoxGeometry(0.14, 0.032, 0.026), mats.steelFastener, [-0.56, 0.82, 0.462], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });

  const gPwrBattery = createCompGroup('pwr_battery');
  addPartMesh(gPwrBattery, new THREE.BoxGeometry(0.45, 0.135, 0.37), mats.batteryPack, [-0.56, 0.815, 0.18]);
  addPartMesh(gPwrBattery, new THREE.BoxGeometry(0.46, 0.024, 0.38), mats.batteryAccent, [-0.56, 0.878, 0.18]);
  addPartMesh(gPwrBattery, new THREE.BoxGeometry(0.045, 0.155, 0.39), mats.mountGreen, [-0.56, 0.82, 0.18]);
  addPartMesh(gPwrBattery, new THREE.BoxGeometry(0.055, 0.032, 0.055), mats.copperTube, [-0.39, 0.895, 0.27]);
  addPartMesh(gPwrBattery, new THREE.BoxGeometry(0.055, 0.032, 0.055), mats.elastomerPad, [-0.39, 0.895, 0.09]);

  const gPwrBmsDc = createCompGroup('pwr_bms_dc');
  addPartMesh(gPwrBmsDc, new THREE.BoxGeometry(0.24, 0.12, 0.28), mats.bmsModule, [-0.56, 0.81, -0.26]);
  for (let k = -4; k <= 4; k++) {
    addPartMesh(gPwrBmsDc, new THREE.BoxGeometry(0.18, 0.036, 0.008), mats.brushedAlum, [-0.56, 0.885, -0.26 + k * 0.024]);
  }
  addPartMesh(gPwrBmsDc, new THREE.BoxGeometry(0.08, 0.04, 0.06), mats.elastomerPad, [-0.46, 0.88, -0.26]);
  addPartMesh(gPwrBmsDc, new THREE.CylinderGeometry(0.012, 0.012, 0.045, 12), mats.batteryAccent, [-0.46, 0.905, -0.26], [0, 0, Math.PI / 2]);

  const gPwrChargePort = createCompGroup('pwr_charge_port');
  addPartMesh(gPwrChargePort, new THREE.BoxGeometry(0.018, 0.085, 0.085), mats.cartSteel, [-0.865, 0.82, 0.34]);
  addPartMesh(gPwrChargePort, new THREE.CylinderGeometry(0.032, 0.032, 0.048, 20), mats.mountGreen, [-0.88, 0.82, 0.34], [0, 0, Math.PI / 2]);
  addPartMesh(gPwrChargePort, new THREE.CylinderGeometry(0.035, 0.035, 0.012, 20), mats.elastomerPad, [-0.905, 0.82, 0.34], [0, 0, Math.PI / 2]);

  // -------------------------------------------------------------------------
  // F. EMBEDDED ELECTRONICS & CONTROL
  // -------------------------------------------------------------------------
  const gElecEnclosure = createCompGroup('elec_enclosure');
  addPartMesh(gElecEnclosure, new THREE.BoxGeometry(0.32, 0.28, 0.105), mats.polymerBox, [-0.62, 1.24, 0.435], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  addPartMesh(gElecEnclosure, new THREE.BoxGeometry(0.326, 0.286, 0.022), mats.polymerBox, [-0.62, 1.24, 0.492], [0, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  [[-0.76, 1.36], [-0.48, 1.36], [-0.76, 1.12], [-0.48, 1.12]].forEach(([ex, ey]) => {
    addPartMesh(gElecEnclosure, new THREE.CylinderGeometry(0.009, 0.009, 0.028, 10), mats.steelFastener, [ex, ey, 0.495], [Math.PI / 2, 0, 0], [1, 1, 1], { isOuterHousing: true, cutawayPanel: true });
  });
  [-0.69, -0.62, -0.55].forEach((gx) => {
    addPartMesh(gElecEnclosure, new THREE.CylinderGeometry(0.014, 0.014, 0.042, 12), mats.elastomerPad, [gx, 1.085, 0.435]);
  });

  const gElecPcb = createCompGroup('elec_pcb');
  addPartMesh(gElecPcb, new THREE.BoxGeometry(0.25, 0.21, 0.012), mats.pcbGreen, [-0.62, 1.24, 0.425]);
  [[-0.72, 1.32], [-0.52, 1.32], [-0.72, 1.16], [-0.52, 1.16]].forEach(([sx, sy]) => {
    addPartMesh(gElecPcb, new THREE.CylinderGeometry(0.006, 0.006, 0.028, 8), mats.brassFitting, [sx, sy, 0.415], [Math.PI / 2, 0, 0]);
  });
  addPartMesh(gElecPcb, new THREE.BoxGeometry(0.19, 0.032, 0.026), mats.mountGreen, [-0.62, 1.158, 0.442]);
  for (let t = -4; t <= 4; t++) {
    addPartMesh(gElecPcb, new THREE.CylinderGeometry(0.005, 0.005, 0.028, 8), mats.steelFastener, [-0.62 + t * 0.02, 1.158, 0.445], [Math.PI / 2, 0, 0]);
  }
  addPartMesh(gElecPcb, new THREE.CylinderGeometry(0.012, 0.012, 0.026, 14), mats.compressorBody, [-0.71, 1.24, 0.442], [Math.PI / 2, 0, 0]);
  addPartMesh(gElecPcb, new THREE.CylinderGeometry(0.010, 0.010, 0.022, 14), mats.compressorBody, [-0.71, 1.28, 0.442], [Math.PI / 2, 0, 0]);
  addPartMesh(gElecPcb, new THREE.BoxGeometry(0.028, 0.018, 0.012), mats.esp32Dark, [-0.53, 1.23, 0.436]);
  addPartMesh(gElecPcb, new THREE.BoxGeometry(0.028, 0.018, 0.012), mats.esp32Dark, [-0.53, 1.27, 0.436]);

  const gElecEsp32 = createCompGroup('elec_esp32');
  addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.092, 0.132, 0.010), mats.esp32Dark, [-0.62, 1.26, 0.452]);
  addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.058, 0.068, 0.014), mats.brushedAlum, [-0.62, 1.272, 0.460]);
  addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.054, 0.020, 0.012), mats.goldPin, [-0.62, 1.316, 0.453]);
  for (let p = -5; p <= 5; p++) {
    addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.006, 0.006, 0.024), mats.goldPin, [-0.658, 1.26 + p * 0.010, 0.446]);
    addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.006, 0.006, 0.024), mats.goldPin, [-0.582, 1.26 + p * 0.010, 0.446]);
  }
  addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.030, 0.020, 0.014), mats.steelFastener, [-0.62, 1.196, 0.460]);
  addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.012, 0.010, 0.012), mats.steelFastener, [-0.642, 1.212, 0.460]);
  addPartMesh(gElecEsp32, new THREE.BoxGeometry(0.012, 0.010, 0.012), mats.steelFastener, [-0.598, 1.212, 0.460]);

  const gElecDisplay = createCompGroup('elec_display');
  addPartMesh(gElecDisplay, new THREE.BoxGeometry(0.24, 0.13, 0.036), mats.elastomerPad, [-0.62, 1.40, 0.485]);
  addPartMesh(gElecDisplay, new THREE.BoxGeometry(0.246, 0.014, 0.058), mats.cartSteel, [-0.62, 1.462, 0.496]);
  addPartMesh(gElecDisplay, new THREE.PlaneGeometry(0.20, 0.098), mats.displayScreen, [-0.62, 1.40, 0.505]);
  addPartMesh(gElecDisplay, new THREE.PlaneGeometry(0.206, 0.102), mats.displayGlass, [-0.62, 1.40, 0.507]);
  addPartMesh(gElecDisplay, new THREE.BoxGeometry(0.16, 0.04, 0.025), mats.mountGreen, [-0.62, 1.33, 0.475]);

  const gElecHarness = createCompGroup('elec_harness');
  addRoutedTube(
    gElecHarness,
    [[-0.69, 1.08, 0.435], [-0.69, 0.94, 0.43], [-0.58, 0.88, 0.36]],
    0.012,
    mats.harnessBlack,
    20
  );
  addRoutedTube(
    gElecHarness,
    [[-0.62, 1.08, 0.435], [-0.62, 0.96, 0.25], [-0.42, 1.02, -0.14]],
    0.011,
    mats.harnessBlack,
    22
  );
  addRoutedTube(
    gElecHarness,
    [[-0.55, 1.08, 0.435], [-0.36, 1.12, 0.44], [-0.18, 1.24, 0.38], [0.28, 1.26, -0.32]],
    0.009,
    mats.harnessBlack,
    26
  );
  [[-0.69, 0.96, 0.43], [-0.62, 0.96, 0.26], [-0.36, 1.12, 0.44], [-0.18, 1.24, 0.38]].forEach((cp) => {
    addPartMesh(gElecHarness, new THREE.CylinderGeometry(0.017, 0.017, 0.018, 12), mats.steelFastener, cp, [0, 0, Math.PI / 2]);
  });

  // -------------------------------------------------------------------------
  // G. SENSORS
  // -------------------------------------------------------------------------
  const gSensTemp = createCompGroup('sens_temp');
  addPartMesh(gSensTemp, new THREE.CylinderGeometry(0.010, 0.010, 0.11, 16), mats.sensorSteel, [0.32, 1.26, -0.33], [Math.PI / 2, 0, 0]);
  addPartMesh(gSensTemp, new THREE.SphereGeometry(0.010, 14, 12), mats.sensorSteel, [0.32, 1.26, -0.275]);
  addPartMesh(gSensTemp, new THREE.CylinderGeometry(0.018, 0.018, 0.024, 6), mats.brassFitting, [0.32, 1.26, -0.365], [Math.PI / 2, 0, 0]);
  addPartMesh(gSensTemp, new THREE.CylinderGeometry(0.015, 0.015, 0.020, 16), mats.sensorAccent, [0.32, 1.26, -0.345], [Math.PI / 2, 0, 0]);

  const gSensHumidity = createCompGroup('sens_humidity');
  addPartMesh(gSensHumidity, new THREE.BoxGeometry(0.064, 0.068, 0.032), mats.polymerBox, [0.48, 1.26, 0.355]);
  addPartMesh(gSensHumidity, new THREE.CylinderGeometry(0.018, 0.018, 0.036, 16), mats.sensorAccent, [0.48, 1.26, 0.355], [Math.PI / 2, 0, 0]);
  addPartMesh(gSensHumidity, new THREE.CylinderGeometry(0.012, 0.012, 0.040, 16), mats.sensorSteel, [0.48, 1.26, 0.355], [Math.PI / 2, 0, 0]);

  const gSensBattery = createCompGroup('sens_battery');
  addPartMesh(gSensBattery, new THREE.BoxGeometry(0.075, 0.032, 0.048), mats.sensorAccent, [-0.42, 0.90, 0.18]);
  addPartMesh(gSensBattery, new THREE.BoxGeometry(0.095, 0.012, 0.028), mats.brassFitting, [-0.42, 0.882, 0.18]);

  // -------------------------------------------------------------------------
  // H. OPTIONAL SOLAR ACCESSORY
  // -------------------------------------------------------------------------
  const gSolarPanel = createCompGroup('solar_panel');
  addPartMesh(gSolarPanel, new THREE.BoxGeometry(1.22, 0.022, 1.04), mats.solarFrame, [boxCenterX, 2.32, 0]);
  addPartMesh(gSolarPanel, new THREE.BoxGeometry(1.18, 0.014, 1.00), mats.solarSurface, [boxCenterX, 2.334, 0]);

  const gSolarMounts = createCompGroup('solar_mounts');
  [[-0.22, 0.44], [0.86, 0.44], [-0.22, -0.44], [0.86, -0.44]].forEach(([sx, sz]) => {
    addPartMesh(gSolarMounts, new THREE.CylinderGeometry(0.014, 0.014, 0.82, 14), mats.solarFrame, [sx, 1.90, sz]);
    addHexBolt(gSolarMounts, [sx, 1.49, sz]);
    addHexBolt(gSolarMounts, [sx, 2.30, sz]);
  });

  // -------------------------------------------------------------------------
  // J. COOLING PATHWAY VISUALIZATION PARTICLES
  // -------------------------------------------------------------------------
  const coolingFlowGroup = new THREE.Group();
  coolingFlowGroup.visible = false;
  scene.add(coolingFlowGroup);

  const coolGeo = new THREE.SphereGeometry(0.016, 12, 12);
  const coolMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const heatMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const flowCurves = [
    // Evaporator chilled airflow inside chamber
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(boxCenterX - 0.06, 1.12, 0.25),
      new THREE.Vector3(boxCenterX + 0.22, 1.12, 0.25),
      new THREE.Vector3(boxCenterX + 0.22, 0.94, 0.0),
      new THREE.Vector3(boxCenterX - 0.06, 0.94, -0.25)
    ]),
    // Condenser hot-side exhaust airflow
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.80, 1.13, 0.12),
      new THREE.Vector3(-0.95, 1.13, 0.12),
      new THREE.Vector3(-1.18, 1.13, 0.12)
    ])
  ];

  flowCurves.forEach((curve, cIdx) => {
    const count = cIdx === 0 ? 14 : 8;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(coolGeo, cIdx === 0 ? coolMat : heatMat);
      coolingFlowGroup.add(mesh);
      coolingFlowParticles.push({ mesh, curve, speed: 0.35 + Math.random() * 0.15, offset: i / count });
    }
  });

  // -------------------------------------------------------------------------
  // K. SUBTLE ASSEMBLY-AXIS GUIDE LINES (VISIBLE DURING EXPLODED VIEW)
  // -------------------------------------------------------------------------
  const explodeGuidesGroup = new THREE.Group();
  explodeGuidesGroup.visible = false;
  scene.add(explodeGuidesGroup);

  const guideMat = new THREE.LineDashedMaterial({
    color: 0x24422e,
    dashSize: 0.035,
    gapSize: 0.025,
    transparent: true,
    opacity: 0.42
  });

  COMPONENT_REGISTRY.forEach((comp) => {
    const grp = componentGroups[comp.id];
    if (!grp) return;
    const mag = Math.hypot(...comp.explodeVec);
    if (mag < 0.12) return;

    const box = new THREE.Box3().setFromObject(grp);
    const anchor = new THREE.Vector3();
    box.getCenter(anchor);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      anchor.clone(),
      anchor.clone()
    ]);
    const line = new THREE.Line(lineGeo, guideMat);
    line.computeLineDistances();
    explodeGuidesGroup.add(line);
    explodeGuideLines.push({
      line,
      anchor: anchor.clone(),
      explodeVec: new THREE.Vector3(...comp.explodeVec),
      compId: comp.id
    });
  });

  return {
    componentGroups,
    interactiveMeshes,
    insulationMeshes,
    outerShellMeshes,
    coolingFlowGroup,
    coolingFlowParticles,
    lidSubLayers,
    explodeGuidesGroup,
    explodeGuideLines
  };
}

// ============================================================================
// 3. MAIN PRODUCT PROTOTYPE SHOWCASE COMPONENT
// ============================================================================
const DEFAULT_HERO_POS = [2.12, 1.74, 2.42];
const DEFAULT_HERO_TARGET = [0.0, 1.08, 0.0];
const DEFAULT_RADIUS = Math.hypot(
  DEFAULT_HERO_POS[0] - DEFAULT_HERO_TARGET[0],
  DEFAULT_HERO_POS[1] - DEFAULT_HERO_TARGET[1],
  DEFAULT_HERO_POS[2] - DEFAULT_HERO_TARGET[2]
);
const MIN_CAMERA_RADIUS = 0.72;
const MAX_CAMERA_RADIUS = 7.40;

export default function App() {
  const [explodeProgress, setExplodeProgress] = useState(0);
  const [targetExplode, setTargetExplode] = useState(null);
  const [cutawayMode, setCutawayMode] = useState(false);
  const [showCoolingFlow, setShowCoolingFlow] = useState(false);
  const [showSolar, setShowSolar] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [partsMenuOpen, setPartsMenuOpen] = useState(false);
  const [zoomPercentage, setZoomPercentage] = useState(100);
  const [visibilityMap, setVisibilityMap] = useState(() => {
    const map = {};
    COMPONENT_REGISTRY.forEach(c => { map[c.id] = true; });
    return map;
  });

  const [calloutProjections, setCalloutProjections] = useState([]);

  const mountRef = useRef(null);
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    cadData: null,
    spherical: { radius: DEFAULT_RADIUS, phi: 1.15, theta: 0.66 },
    targetSpherical: { radius: DEFAULT_RADIUS, phi: 1.15, theta: 0.66 },
    lookAtTarget: new THREE.Vector3(...DEFAULT_HERO_TARGET),
    desiredLookAt: new THREE.Vector3(...DEFAULT_HERO_TARGET)
  });

  const stateRef = useRef({});
  stateRef.current = {
    selectedId,
    hoveredId,
    explodeProgress,
    targetExplode,
    cutawayMode,
    showCoolingFlow,
    showSolar,
    visibilityMap
  };

  const selectedComponent = useMemo(
    () => COMPONENT_REGISTRY.find(c => c.id === selectedId) || null,
    [selectedId]
  );

  const isExploded = explodeProgress > 0.15;

  const updateZoomBadge = useCallback((radiusVal) => {
    const pct = Math.round((DEFAULT_RADIUS / Math.max(MIN_CAMERA_RADIUS, radiusVal)) * 100);
    setZoomPercentage(Math.max(45, Math.min(450, pct)));
  }, []);

  const applyZoomFactor = useCallback((scaleFactor) => {
    const t = threeRef.current;
    const nextRadius = Math.max(
      MIN_CAMERA_RADIUS,
      Math.min(MAX_CAMERA_RADIUS, t.targetSpherical.radius * scaleFactor)
    );
    t.targetSpherical.radius = nextRadius;
    updateZoomBadge(nextRadius);
  }, [updateZoomBadge]);

  const handleZoomIn = useCallback(() => {
    applyZoomFactor(0.84);
  }, [applyZoomFactor]);

  const handleZoomOut = useCallback(() => {
    applyZoomFactor(1.19);
  }, [applyZoomFactor]);

  const moveCameraToCartesian = useCallback((posArr, targetArr = DEFAULT_HERO_TARGET) => {
    const t = threeRef.current;
    const offset = new THREE.Vector3(...posArr).sub(new THREE.Vector3(...targetArr));
    const radius = Math.max(MIN_CAMERA_RADIUS, Math.min(MAX_CAMERA_RADIUS, offset.length()));
    const phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
    const theta = Math.atan2(offset.x, offset.z);
    t.targetSpherical = {
      radius,
      phi: Math.max(0.14, Math.min(Math.PI / 2 - 0.02, phi)),
      theta
    };
    t.desiredLookAt.set(...targetArr);
    updateZoomBadge(radius);
  }, [updateZoomBadge]);

  const handleResetCameraOnly = useCallback(() => {
    if (stateRef.current.explodeProgress > 0.25) {
      moveCameraToCartesian([2.68, 2.04, 2.98], [0.0, 1.14, 0]);
    } else {
      moveCameraToCartesian(DEFAULT_HERO_POS, DEFAULT_HERO_TARGET);
    }
  }, [moveCameraToCartesian]);

  const focusOnComponent = useCallback((compId) => {
    const comp = COMPONENT_REGISTRY.find(c => c.id === compId);
    if (!comp || !threeRef.current.cadData) return;
    const group = threeRef.current.cadData.componentGroups[compId];
    if (!group) return;

    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 0.18);
    const inspectDist = Math.max(0.95, Math.min(2.15, maxDim * 2.15));

    const sideX = center.x < -0.15 ? -0.68 : center.x > 0.25 ? 0.68 : 0.58;
    const sideZ = center.z < -0.1 ? -0.72 : 0.78;
    const dir = new THREE.Vector3(sideX, 0.34, sideZ).normalize().multiplyScalar(inspectDist);
    const camPos = [center.x + dir.x, center.y + dir.y, center.z + dir.z];
    moveCameraToCartesian(camPos, [center.x, center.y, center.z]);
  }, [moveCameraToCartesian]);

  const handleSelectAndFocus = useCallback((compId) => {
    if (!compId) {
      setSelectedId(null);
      setDetailsExpanded(false);
      return;
    }
    setSelectedId(compId);
    focusOnComponent(compId);
  }, [focusOnComponent]);

  const handleAssemble = useCallback(() => {
    setTargetExplode(0);
    setSelectedId(null);
    moveCameraToCartesian(DEFAULT_HERO_POS, DEFAULT_HERO_TARGET);
  }, [moveCameraToCartesian]);

  const handleToggleExplode = useCallback(() => {
    if (explodeProgress > 0.2) {
      setTargetExplode(0);
      moveCameraToCartesian(DEFAULT_HERO_POS, DEFAULT_HERO_TARGET);
    } else {
      setTargetExplode(0.85);
      if (threeRef.current.targetSpherical.radius < 3.4) {
        moveCameraToCartesian([2.68, 2.04, 2.98], [0.0, 1.14, 0]);
      }
    }
  }, [explodeProgress, moveCameraToCartesian]);

  const handleToggleCutaway = useCallback(() => {
    setCutawayMode(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedId(null);
    setDetailsExpanded(false);
    setTargetExplode(0);
    setCutawayMode(false);
    setShowCoolingFlow(false);
    setShowSolar(true);
    setCameraMenuOpen(false);
    setPartsMenuOpen(false);
    const resetVis = {};
    COMPONENT_REGISTRY.forEach(c => { resetVis[c.id] = true; });
    setVisibilityMap(resetVis);
    moveCameraToCartesian(DEFAULT_HERO_POS, DEFAULT_HERO_TARGET);
  }, [moveCameraToCartesian]);

  // ============================================================================
  // 4. THREE.JS INITIALIZATION & REAL-TIME ANIMATION LOOP
  // ============================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f2ee);
    scene.fog = new THREE.Fog(0xf3f2ee, 10.5, 24);

    const camera = new THREE.PerspectiveCamera(
      35,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.08,
      45
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Studio IBL Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // Professional Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(4.5, 6.2, 4.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.85);
    fillLight.position.set(-5.0, 3.5, -3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 0.65);
    rimLight.position.set(0.0, 4.2, -5.5);
    scene.add(rimLight);

    // Subtle Ground Contact Plinth
    const shadowGeo = new THREE.PlaneGeometry(14, 14);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.24;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Build CAD Scene
    const cadData = buildCoolCartCADScene(scene);
    threeRef.current.scene = scene;
    threeRef.current.camera = camera;
    threeRef.current.renderer = renderer;
    threeRef.current.cadData = cadData;

    // Camera initial pose
    const initSph = threeRef.current.spherical;
    const sinPhi = Math.sin(initSph.phi) * initSph.radius;
    camera.position.set(
      initSph.radius * Math.sin(initSph.theta),
      initSph.radius * Math.cos(initSph.phi) + 1.08,
      initSph.radius * Math.cos(initSph.theta)
    );
    camera.lookAt(DEFAULT_HERO_TARGET);

    // Interaction handlers
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const activeTouchPoints = new Map();
    let lastPinchDist = null;
    let safariGestureStartRadius = null;
    let isDragging = false;
    let isRightDrag = false;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;

    const getVisibleMeshes = () =>
      cadData.interactiveMeshes.filter(m => {
        const group = cadData.componentGroups[m.userData.compId];
        return group && group.visible && m.visible && m.material.opacity > 0.15;
      });

    const clampTargetRadius = (r) => {
      const clamped = Math.max(MIN_CAMERA_RADIUS, Math.min(MAX_CAMERA_RADIUS, r));
      const pct = Math.round((DEFAULT_RADIUS / clamped) * 100);
      setZoomPercentage(Math.max(45, Math.min(450, pct)));
      return clamped;
    };

    const onPointerDown = (e) => {
      activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouchPoints.size === 2) {
        const pts = Array.from(activeTouchPoints.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        isDragging = false;
        return;
      }
      isDragging = true;
      isRightDrag = e.button === 2 || e.shiftKey;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = (e) => {
      if (activeTouchPoints.has(e.pointerId)) {
        activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (activeTouchPoints.size === 2) {
        const pts = Array.from(activeTouchPoints.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist && lastPinchDist > 10 && dist > 10) {
          const ratio = lastPinchDist / dist;
          const t = threeRef.current;
          t.targetSpherical.radius = clampTargetRadius(t.targetSpherical.radius * ratio);
        }
        lastPinchDist = dist;
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        const t = threeRef.current;
        if (isRightDrag) {
          const panSpeed = 0.0024 * t.targetSpherical.radius;
          const right = new THREE.Vector3();
          camera.getWorldDirection(right);
          right.cross(camera.up).normalize();
          t.desiredLookAt.addScaledVector(right, -dx * panSpeed);
          t.desiredLookAt.x = Math.max(-1.05, Math.min(1.05, t.desiredLookAt.x));
          t.desiredLookAt.z = Math.max(-1.05, Math.min(1.05, t.desiredLookAt.z));
          t.desiredLookAt.y = Math.max(0.42, Math.min(1.95, t.desiredLookAt.y + dy * panSpeed));
        } else {
          t.targetSpherical.theta -= dx * 0.0062;
          t.targetSpherical.phi = Math.max(
            0.14,
            Math.min(Math.PI / 2 - 0.02, t.targetSpherical.phi - dy * 0.0062)
          );
        }
        return;
      }

      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(getVisibleMeshes(), false);
        if (hits.length > 0) {
          setHoveredId(hits[0].object.userData.compId);
          renderer.domElement.style.cursor = 'pointer';
        } else {
          setHoveredId(null);
          renderer.domElement.style.cursor = 'grab';
        }
      }
    };

    const onPointerUp = (e) => {
      activeTouchPoints.delete(e.pointerId);
      if (activeTouchPoints.size < 2) {
        lastPinchDist = null;
      }
      if (!isDragging) return;
      isDragging = false;
      const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moveDist < 5 && e.button === 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(getVisibleMeshes(), false);
        if (hits.length > 0) {
          const clickedId = hits[0].object.userData.compId;
          setSelectedId(clickedId);
          const group = cadData.componentGroups[clickedId];
          if (group) {
            const box = new THREE.Box3().setFromObject(group);
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            box.getCenter(center);
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z, 0.18);
            const inspectDist = Math.max(0.95, Math.min(2.15, maxDim * 2.15));
            const sideX = center.x < -0.15 ? -0.68 : center.x > 0.25 ? 0.68 : 0.58;
            const sideZ = center.z < -0.1 ? -0.72 : 0.78;
            const offset = new THREE.Vector3(sideX, 0.34, sideZ).normalize().multiplyScalar(inspectDist);
            const radius = clampTargetRadius(offset.length());
            const phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
            const theta = Math.atan2(offset.x, offset.z);
            threeRef.current.targetSpherical = { radius, phi, theta };
            threeRef.current.desiredLookAt.copy(center);
          }
        } else {
          setSelectedId(null);
          setDetailsExpanded(false);
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const t = threeRef.current;
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= 120;

      const isTrackpadPinch = e.ctrlKey || e.metaKey;
      const sensitivity = isTrackpadPinch ? 0.0085 : 0.0016;
      const clampedDelta = Math.max(-160, Math.min(160, dy));

      const zoomFactor = Math.exp(clampedDelta * sensitivity);
      t.targetSpherical.radius = clampTargetRadius(t.targetSpherical.radius * zoomFactor);
    };

    const onGestureStart = (e) => {
      e.preventDefault();
      safariGestureStartRadius = threeRef.current.targetSpherical.radius;
    };

    const onGestureChange = (e) => {
      e.preventDefault();
      if (safariGestureStartRadius && e.scale > 0) {
        const t = threeRef.current;
        t.targetSpherical.radius = clampTargetRadius(safariGestureStartRadius / e.scale);
      }
    };

    const onGestureEnd = (e) => {
      e.preventDefault();
      safariGestureStartRadius = null;
    };

    const onContextMenu = (e) => e.preventDefault();

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('gesturestart', onGestureStart, { passive: false });
    domEl.addEventListener('gesturechange', onGestureChange, { passive: false });
    domEl.addEventListener('gestureend', onGestureEnd, { passive: false });
    domEl.addEventListener('contextmenu', onContextMenu);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let reqId;
    let frameCounter = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const st = stateRef.current;
      const t = threeRef.current;

      if (st.targetExplode !== null) {
        const diff = st.targetExplode - st.explodeProgress;
        if (Math.abs(diff) < 0.004) {
          setExplodeProgress(st.targetExplode);
          setTargetExplode(null);
        } else {
          setExplodeProgress(prev => prev + diff * 0.12);
        }
      }

      const ex = st.explodeProgress;

      COMPONENT_REGISTRY.forEach(comp => {
        const grp = cadData.componentGroups[comp.id];
        if (!grp) return;

        const isVisInMap = st.visibilityMap[comp.id] !== false;
        const isSolarAllowed = comp.optional ? st.showSolar : true;
        grp.visible = isVisInMap && isSolarAllowed;

        const targetX = comp.basePos[0] + comp.explodeVec[0] * ex;
        const targetY = comp.basePos[1] + comp.explodeVec[1] * ex;
        const targetZ = comp.basePos[2] + comp.explodeVec[2] * ex;
        grp.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.16);
      });

      cadData.lidSubLayers.forEach(layer => {
        const targetY = layer.baseY + layer.explodeOffsetY * ex;
        layer.mesh.position.y += (targetY - layer.mesh.position.y) * 0.16;
      });

      cadData.explodeGuidesGroup.visible = ex > 0.08;
      if (ex > 0.08) {
        cadData.explodeGuideLines.forEach(gItem => {
          const grp = cadData.componentGroups[gItem.compId];
          gItem.line.visible = grp ? grp.visible : false;
          if (!gItem.line.visible) return;
          const posAttr = gItem.line.geometry.attributes.position;
          const endPt = gItem.anchor.clone().add(grp.position);
          posAttr.setXYZ(1, endPt.x, endPt.y, endPt.z);
          posAttr.needsUpdate = true;
          gItem.line.computeLineDistances();
        });
      }

      cadData.interactiveMeshes.forEach(mesh => {
        const cId = mesh.userData.compId;
        const isSelected = st.selectedId === cId;
        const isHovered = st.hoveredId === cId;

        let targetOpacity = mesh.userData.baseOpacity;

        if (st.cutawayMode && !isSelected) {
          if (mesh.userData.cutawayPanel && mesh.userData.isOuterHousing) {
            targetOpacity = 0.09;
          } else if (mesh.userData.cutawayPanel && mesh.userData.isInsulation) {
            targetOpacity = 0.22;
          } else if (mesh.userData.isOuterHousing) {
            targetOpacity = 0.35;
          }
        }

        if (st.selectedId && !isSelected) {
          targetOpacity = Math.min(targetOpacity, 0.38);
        }

        mesh.material.transparent = targetOpacity < 0.99;
        mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.18;
        mesh.material.depthWrite = mesh.material.opacity > 0.45;

        if (mesh.material.emissive) {
          if (isSelected) {
            mesh.material.emissive.setHex(0x15803d);
            mesh.material.emissiveIntensity = 0.38;
          } else if (isHovered) {
            mesh.material.emissive.setHex(0x2d4f38);
            mesh.material.emissiveIntensity = 0.18;
          } else {
            mesh.material.emissive.setHex(mesh.userData.baseEmissive);
            mesh.material.emissiveIntensity = mesh.userData.baseEmissiveIntensity;
          }
        }
      });

      cadData.coolingFlowGroup.visible = st.showCoolingFlow;
      if (st.showCoolingFlow) {
        cadData.coolingFlowParticles.forEach(p => {
          p.offset = (p.offset + dt * p.speed) % 1.0;
          const pt = p.curve.getPointAt(p.offset);
          const tangent = p.curve.getTangentAt(p.offset);
          p.mesh.position.copy(pt);
          p.mesh.lookAt(pt.clone().add(tangent));
        });

        const fanGrp = cadData.componentGroups['ref_fan'];
        if (fanGrp) {
          fanGrp.children.forEach((ch, idx) => {
            if (idx >= 2) ch.rotation.x += dt * 7.5;
          });
        }
      }

      t.spherical.radius += (t.targetSpherical.radius - t.spherical.radius) * 0.16;
      t.spherical.phi += (t.targetSpherical.phi - t.spherical.phi) * 0.14;
      t.spherical.theta += (t.targetSpherical.theta - t.spherical.theta) * 0.14;
      t.lookAtTarget.lerp(t.desiredLookAt, 0.14);

      const sinPhiRadius = Math.sin(t.spherical.phi) * t.spherical.radius;
      camera.position.x = t.lookAtTarget.x + sinPhiRadius * Math.sin(t.spherical.theta);
      camera.position.y = t.lookAtTarget.y + Math.cos(t.spherical.phi) * t.spherical.radius;
      camera.position.z = t.lookAtTarget.z + sinPhiRadius * Math.cos(t.spherical.theta);
      camera.lookAt(t.lookAtTarget);

      renderer.render(scene, camera);

      frameCounter++;
      if (frameCounter % 2 === 0 && container.clientWidth > 0) {
        const w = container.clientWidth;
        const h = container.clientHeight;

        if (st.explodeProgress > 0.15) {
          const leftItems = [];
          const rightItems = [];

          EXPLODED_CALLOUT_LIST.forEach(comp => {
            const grp = cadData.componentGroups[comp.id];
            if (!grp || !grp.visible) return;

            const box = new THREE.Box3().setFromObject(grp);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const proj = center.clone().project(camera);
            if (proj.z > 1) return;

            const sx = (proj.x * 0.5 + 0.5) * w;
            const sy = (-proj.y * 0.5 + 0.5) * h;

            const item = {
              id: comp.id,
              num: comp.labelNum,
              text: comp.shortLabel,
              ax: sx,
              ay: sy,
              side: comp.labelSide || (sx < w * 0.5 ? 'left' : 'right')
            };

            if (item.side === 'left') leftItems.push(item);
            else rightItems.push(item);
          });

          const distributeSide = (list, isLeft) => {
            list.sort((a, b) => a.ay - b.ay);
            const count = list.length;
            const topBound = Math.max(85, h * 0.14);
            const bottomBound = Math.min(h - 115, h * 0.82);
            const span = Math.max(160, bottomBound - topBound);

            list.forEach((it, idx) => {
              const stepY = count > 1 ? topBound + (idx / (count - 1)) * span : h * 0.5;
              it.ly = stepY * 0.65 + it.ay * 0.35;
              if (idx > 0 && it.ly - list[idx - 1].ly < 38) {
                it.ly = list[idx - 1].ly + 38;
              }
              it.lx = isLeft
                ? Math.max(24, Math.min(it.ax - 95, w * 0.18))
                : Math.min(w - 24, Math.max(it.ax + 95, w * 0.82));
            });
          };

          distributeSide(leftItems, true);
          distributeSide(rightItems, false);
          setCalloutProjections([...leftItems, ...rightItems]);
        } else {
          setCalloutProjections(prev => (prev.length > 0 ? [] : prev));
        }
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('gesturestart', onGestureStart);
      domEl.removeEventListener('gesturechange', onGestureChange);
      domEl.removeEventListener('gestureend', onGestureEnd);
      domEl.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', handleResize);
      pmremGenerator.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  const hoveredComponent = useMemo(
    () => COMPONENT_REGISTRY.find(c => c.id === hoveredId) || null,
    [hoveredId]
  );

  return (
    <div
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      className="relative w-screen h-screen overflow-hidden bg-[#f3f2ee] text-[#18181b] antialiased select-none"
    >
      {/* ====================================================================
          1. FULL-SCREEN 3D PRODUCT PROTOTYPE VIEWPORT
      ==================================================================== */}
      <div ref={mountRef} className="w-full h-full touch-none" />

      {/* ====================================================================
          2. SVG LEADER-LINE CALLOUT OVERLAY (EXPLODED VIEW)
      ==================================================================== */}
      {isExploded && calloutProjections.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <svg className="w-full h-full">
            {calloutProjections.map(item => {
              const isSel = selectedId === item.id;
              const isHov = hoveredId === item.id;
              const elbowX = item.side === 'left' ? item.lx + 24 : item.lx - 24;
              const strokeColor = isSel ? '#15803d' : isHov ? '#24422e' : '#71717a';
              return (
                <g key={item.id}>
                  <polyline
                    points={`${item.ax},${item.ay} ${elbowX},${item.ly} ${item.lx},${item.ly}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSel ? '1.6' : '1'}
                    opacity={selectedId && !isSel ? 0.32 : 0.78}
                  />
                  <circle
                    cx={item.ax}
                    cy={item.ay}
                    r={isSel ? 3.8 : 2.6}
                    fill={isSel ? '#15803d' : '#24422e'}
                    opacity={selectedId && !isSel ? 0.32 : 0.95}
                  />
                </g>
              );
            })}
          </svg>

          {calloutProjections.map(item => {
            const isSel = selectedId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectAndFocus(item.id)}
                style={{
                  left: `${item.lx}px`,
                  top: `${item.ly}px`,
                  transform: item.side === 'left' ? 'translate(-100%, -50%)' : 'translate(0%, -50%)'
                }}
                className={`pointer-events-auto absolute flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-normal transition-all backdrop-blur-md border shadow-xs ${
                  isSel
                    ? 'bg-[#24422e] text-white border-[#24422e] font-semibold scale-105'
                    : 'bg-white/92 hover:bg-white text-zinc-800 border-zinc-300/80 font-medium'
                } ${selectedId && !isSel ? 'opacity-45 hover:opacity-100' : 'opacity-100'}`}
              >
                <span
                  className={`font-mono text-[10px] font-semibold ${
                    isSel ? 'text-emerald-200' : 'text-[#24422e]'
                  }`}
                >
                  {item.num}
                </span>
                <span className="whitespace-nowrap">{item.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          3. BRAND MARK
      ==================================================================== */}
      <div className="absolute top-6 left-7 z-20 flex items-center gap-3 pointer-events-none">
        <div className="w-7 h-7 rounded-lg bg-[#24422e] text-white flex items-center justify-center text-[11px] font-semibold tracking-tight shadow-xs">
          CC
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-semibold tracking-[-0.02em] text-[15px] text-zinc-900">
            COOLCART
          </span>
          <span className="text-[11px] font-medium text-zinc-500 hidden sm:inline">
            Modular Cooling Prototype
          </span>
        </div>
      </div>

      {/* ====================================================================
          4. SECONDARY UTILITIES (COOLING FLOW, SOLAR, CAMERAS, PARTS)
      ==================================================================== */}
      <div className="absolute top-6 right-7 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowCoolingFlow(v => !v)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border transition-all ${
            showCoolingFlow
              ? 'bg-sky-700 text-white border-sky-800 shadow-xs'
              : 'bg-white/85 hover:bg-white text-zinc-700 border-zinc-300/80'
          }`}
          title="Toggle conceptual cooling & heat-rejection airflow"
        >
          <Snowflake className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cooling Flow</span>
        </button>

        <button
          onClick={() => setShowSolar(s => !s)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border transition-all ${
            showSolar
              ? 'bg-white/85 hover:bg-white text-zinc-700 border-zinc-300/80'
              : 'bg-zinc-200/75 text-zinc-500 border-zinc-300/60'
          }`}
          title="Toggle optional auxiliary solar canopy"
        >
          <Sun className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{showSolar ? 'Solar Canopy' : 'Solar Off'}</span>
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setCameraMenuOpen(o => !o);
              setPartsMenuOpen(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/85 hover:bg-white text-zinc-700 border border-zinc-300/80 backdrop-blur-md transition-all"
            title="Camera Angle Presets"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Views</span>
          </button>

          {cameraMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white/95 backdrop-blur-md rounded-xl border border-zinc-200 shadow-lg py-1.5 z-30 text-xs">
              {[
                { label: 'Hero View (3/4)', pos: DEFAULT_HERO_POS, target: DEFAULT_HERO_TARGET },
                { label: 'Engineering Service View', pos: [-2.18, 1.46, 1.62], target: [-0.42, 1.06, 0.08] },
                { label: 'Exploded Framing', pos: [2.68, 2.04, 2.98], target: [0.0, 1.14, 0] },
                { label: 'Front Elevation', pos: [0.0, 1.22, 3.25], target: [0.0, 1.08, 0] },
                { label: 'Top Plan', pos: [0.0, 4.2, 0.01], target: [0.0, 1.08, 0] }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    moveCameraToCartesian(preset.pos, preset.target);
                    setCameraMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-zinc-100 text-zinc-700 font-medium"
                >
                  {preset.label}
                </button>
              ))}
              <div className="my-1 border-t border-zinc-200/80" />
              <button
                onClick={() => {
                  handleResetCameraOnly();
                  setCameraMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-zinc-100 text-[#24422e] font-semibold"
              >
                Reset Camera Only
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setPartsMenuOpen(o => !o);
              setCameraMenuOpen(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/85 hover:bg-white text-zinc-700 border border-zinc-300/80 backdrop-blur-md transition-all"
            title="Show or Hide Individual Parts"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Parts</span>
          </button>

          {partsMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white/95 backdrop-blur-md rounded-xl border border-zinc-200 shadow-lg p-2 z-30 text-xs">
              <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-zinc-200">
                <span className="font-semibold text-zinc-800 text-[11px]">
                  Assembly Parts ({COMPONENT_REGISTRY.length})
                </span>
                <button
                  onClick={() => {
                    const all = {};
                    COMPONENT_REGISTRY.forEach(c => { all[c.id] = true; });
                    setVisibilityMap(all);
                  }}
                  className="text-[11px] text-[#24422e] font-semibold hover:underline"
                >
                  Show All
                </button>
              </div>
              <div className="space-y-0.5">
                {COMPONENT_REGISTRY.map(comp => {
                  const vis = visibilityMap[comp.id] !== false;
                  return (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between px-2 py-1 rounded hover:bg-zinc-100"
                    >
                      <button
                        onClick={() => {
                          handleSelectAndFocus(comp.id);
                          setPartsMenuOpen(false);
                        }}
                        className="text-left truncate flex-1 pr-2 text-zinc-700 hover:text-zinc-900 font-medium"
                      >
                        {comp.name}
                      </button>
                      <button
                        onClick={() =>
                          setVisibilityMap(prev => ({ ...prev, [comp.id]: !vis }))
                        }
                        className="text-zinc-500 hover:text-zinc-800 p-0.5"
                      >
                        {vis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-300" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          5. FLOATING ON-SCREEN ZOOM CONTROL PILL (− ZOOM +)
      ==================================================================== */}
      <div className="absolute bottom-6 right-7 z-20 flex items-center bg-white/92 backdrop-blur-md p-1 rounded-full border border-zinc-300/80 shadow-md">
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/70 active:scale-95 transition-all"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetCameraOnly}
          className="px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 tracking-tight tabular-nums"
          title="Click to reset camera angle and zoom"
        >
          {zoomPercentage}%
        </button>

        <button
          onClick={handleZoomIn}
          className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/70 active:scale-95 transition-all"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ====================================================================
          6. FLOATING BOTTOM DOCK: ASSEMBLED | EXPLODE | CUTAWAY | RESET
      ==================================================================== */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/92 backdrop-blur-md p-1.5 rounded-full border border-zinc-300/80 shadow-lg">
        <button
          onClick={handleAssemble}
          className={`px-4 py-2 rounded-full text-xs font-medium tracking-tight transition-all ${
            !isExploded
              ? 'bg-[#24422e] text-white shadow-xs'
              : 'text-zinc-700 hover:bg-zinc-200/60'
          }`}
        >
          Assembled
        </button>

        <button
          onClick={handleToggleExplode}
          className={`px-4 py-2 rounded-full text-xs font-medium tracking-tight transition-all ${
            isExploded
              ? 'bg-[#24422e] text-white shadow-xs'
              : 'text-zinc-700 hover:bg-zinc-200/60'
          }`}
        >
          Explode
        </button>

        {explodeProgress > 0.01 && (
          <div className="hidden sm:flex items-center px-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={explodeProgress}
              onChange={(e) => {
                setTargetExplode(null);
                setExplodeProgress(parseFloat(e.target.value));
              }}
              aria-label="Exploded view separation"
              className="w-20 accent-[#24422e] cursor-pointer h-1 bg-zinc-300 rounded-lg"
            />
          </div>
        )}

        <button
          onClick={handleToggleCutaway}
          className={`px-4 py-2 rounded-full text-xs font-medium tracking-tight transition-all ${
            cutawayMode
              ? 'bg-[#24422e] text-white shadow-xs'
              : 'text-zinc-700 hover:bg-zinc-200/60'
          }`}
        >
          Cutaway
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium tracking-tight text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-all"
          title="Restore original assembly and camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* ====================================================================
          7. SELECTED COMPONENT FLOATING INSPECTION CARD
      ==================================================================== */}
      {selectedComponent && (
        <div className="absolute top-20 left-7 z-20 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/90 shadow-xl p-4 text-xs animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[10px] font-semibold text-[#24422e] tracking-wider uppercase">
                {selectedComponent.category} • {selectedComponent.status}
              </span>
              <h3 className="font-semibold text-zinc-900 text-sm mt-0.5">
                {selectedComponent.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          <p className="text-zinc-600 leading-relaxed mb-3">
            {selectedComponent.purpose}
          </p>

          <div className="space-y-1.5 pt-2 border-t border-zinc-100 text-[11px]">
            <div className="text-zinc-500">
              <strong className="text-zinc-700 font-medium">Interactions:</strong>{' '}
              {selectedComponent.interactions}
            </div>
            {selectedComponent.engineeringNote && (
              <div className="text-amber-700 bg-amber-50/80 px-2.5 py-1.5 rounded-lg mt-1 border border-amber-200/50">
                <strong>Engineering Note:</strong> {selectedComponent.engineeringNote}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}