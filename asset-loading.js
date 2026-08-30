"use strict";

  // ---------- Assets ----------
  const ASSET_SOURCES = {
    fireball_sheet: "fireball_sheet.webp",
    shield_sheet: "shield_sheet.webp",
    training_airship: "training_airship.webp",
    blimp:   "blimp.webp?cb=2",
    pirate_bomb: "pirate_bomb.webp",
    power_icon_blimp3: "power_icon_blimp3.webp",
    power_icon_blimp4: "power_icon_blimp4.webp",
    power_icon_blimp5: "power_icon_blimp5.webp",
    power_icon_blimp7: "power_icon_blimp7.webp",
    power_icon_blimp8: "power_icon_blimp8.webp",
    power_icon_blimp9: "power_icon_blimp9.webp",
    cloud:   "cloud.webp?cb=2",
    cloud_soft_a: "cloud_soft_a.webp",
    cloud_soft_b: "cloud_soft_b.webp",
    skylineFar: "skylineFar.webp",
    skylineFarL2: "IMG_0845.png",
    skylineFarL3: "IMG_0844.png",
    powerlines: "powerlines.webp",
    sketchSkyline: "sketchSkyline.webp",
    streetTexture: "street_texture.webp",
    vehicle_towtruck: "vehicle_towtruck.webp",
    vehicle_tanker: "vehicle_tanker.webp",
    vehicle_transit: "vehicle_transit.webp",
    vehicle_roadster: "vehicle_roadster.webp",
    farBg: "Far_Bg.jpg",
    bldg_cinema:     "bldg_cinema.webp?cb=2",
    bldg_apothecary: "bldg_apothecary.webp?cb=2",
    bldg_newspaper:  "bldg_newspaper.webp?cb=2",
    bldg_plain:      "bldg_plain.webp?cb=2",
    bldg_hotel:      "bldg_hotel.webp?cb=2",
    bldg_library:    "bldg_library.webp?cb=2",
    bldg_l3_factoryrow:  "IMG_0761.png",
    bldg_l3_smokestacks: "IMG_0762.png",
    bldg_l3_geartower:   "IMG_0766.png",
    bldg_l3_clocktower:  "IMG_0767.png",
    bldg_l3_furnacehouse:"IMG_0768.png",
    bldg_l3_minetower:   "IMG_0769.png",
    bldg_l3_pipeworks:   "IMG_0770.png",
    streetrow1: "streetrow1.webp",
    airfield_strip: "airfield_strip.webp",
    parallax_mountains: "mountains_cutout.webp",
    art_deco_sky: "art_deco_sky.webp",
    art_deco_clouds: "art_deco_clouds.webp",
    hotair_red_cream: "hotair_red_cream.webp",
    hotair_night_stars: "hotair_night_stars.webp",
    hotair_floral_teal: "hotair_floral_teal.webp",
    hotair_steampunk: "hotair_steampunk.webp",
    hotair_mosaic: "hotair_mosaic.webp",
    hotair_compass: "hotair_compass.webp",

    cloud_01_top_left_large: "cloud_01_top_left_large.webp",
    cloud_02_top_right_large: "cloud_02_top_right_large.webp",
    cloud_03_middle_center_large: "cloud_03_middle_center_large.webp",
    cloud_04_middle_right_small: "cloud_04_middle_right_small.webp",
    cloud_05_middle_left_small: "cloud_05_middle_left_small.webp",
    cloud_06_middle_tiny_wisp: "cloud_06_middle_tiny_wisp.webp",
    cloud_07_bottom_right_large: "cloud_07_bottom_right_large.webp",
    cloud_08_bottom_left_large: "cloud_08_bottom_left_large.webp",
    cloud_09_bottom_left_small: "cloud_09_bottom_left_small.webp",
    cloud_10_bottom_center_tiny: "cloud_10_bottom_center_tiny.webp",
    cloud_11_bottom_right_small: "cloud_11_bottom_right_small.webp",
    cloud_12_bottom_center_tiny2: "cloud_12_bottom_center_tiny2.webp",

    mountains_cutout: "mountains_cutout.webp",
    landing_field: "landing_field.webp",
    wind_flag_left: "wind_flag_left.webp",
    finish_flag: "finish_flag.webp",
    wind_sock: "wind_sock.webp",
    ruff_01: "ruff_01.webp",
    ruff_02: "ruff_02.webp",
    ruff_03: "ruff_03.webp",
    ruff_04: "ruff_04.webp",
    ruff_05: "ruff_05.webp",
    ruff_06: "ruff_06.webp",
    ruff_07: "ruff_07.webp",
    ruff_08: "ruff_08.webp",
    ruff_09: "ruff_09.webp",
    ruff_10: "ruff_10.webp",
    ruff_11: "ruff_11.webp",
    ruff_12: "ruff_12.webp",
    ruff_13: "ruff_13.webp",
    ruff_14: "ruff_14.webp",
    ruff_15: "ruff_15.webp",
    ruff_16: "ruff_16.webp",
    ruff_17: "ruff_17.webp",
    ruff_18: "ruff_18.webp",
    ruff_19: "ruff_19.webp",
    ruff_20: "ruff_20.webp",
    ruff_21: "ruff_21.webp",
    ruff_22: "ruff_22.webp",
    ruff_23: "ruff_23.webp",
    ruff_24: "ruff_24.webp",
    ruff_25: "ruff_25.webp",
    ruff_26: "ruff_26.webp",
    ruff_27: "ruff_27.webp",
    ruff_28: "ruff_28.webp",
    ruff_29: "ruff_29.webp",
    ruff_30: "ruff_30.webp",
    ruff_31: "ruff_31.webp",
    ruff_32: "ruff_32.webp",
    ruff_33: "ruff_33.webp",
    ruff_34: "ruff_34.webp",
    ruff_35: "ruff_35.webp",
    ruff_36: "ruff_36.webp",
    blue_crystal_01: "blue_crystal_01.webp",
    blue_crystal_02: "blue_crystal_02.webp",
    blue_crystal_03: "blue_crystal_03.webp",
    blue_crystal_04: "blue_crystal_04.webp",
    blue_crystal_05: "blue_crystal_05.webp",
    blue_crystal_06: "blue_crystal_06.webp",
    blue_crystal_07: "blue_crystal_07.webp",
    blue_crystal_08: "blue_crystal_08.webp",
    blue_crystal_09: "blue_crystal_09.webp",
    blue_crystal_10: "blue_crystal_10.webp",
    blue_crystal_11: "blue_crystal_11.webp",
    blue_crystal_12: "blue_crystal_12.webp",
    blue_crystal_13: "blue_crystal_13.webp",
    blue_crystal_14: "blue_crystal_14.webp",
    blue_crystal_15: "blue_crystal_15.webp",
    blue_crystal_16: "blue_crystal_16.webp",
    blue_crystal_17: "blue_crystal_17.webp",
    blue_crystal_18: "blue_crystal_18.webp",
    blue_crystal_19: "blue_crystal_19.webp",
    blue_crystal_20: "blue_crystal_20.webp",
    blue_crystal_21: "blue_crystal_21.webp",
    blue_crystal_22: "blue_crystal_22.webp",
    blue_crystal_23: "blue_crystal_23.webp",
    blue_crystal_24: "blue_crystal_24.webp",
    blue_crystal_25: "blue_crystal_25.webp",

    streetrow2: "level2_buildings_strip.png",
    streetlamp1:     "IMG_0734.png",
    boss:            "boss_throw_01.webp?cb=2",
    boss2:           "boss2.webp?cb=2",
    boss2_01: "boss2_01.webp",
    boss2_02: "boss2_02.webp",
    boss2_03: "boss2_03.webp",
    boss2_04: "boss2_04.webp",
    boss2_05: "boss2_05.webp",
    boss2_06: "boss2_06.webp",
    boss2_07: "boss2_07.webp",
    boss2_08: "boss2_08.webp",
    boss2_09: "boss2_09.webp",
    boss2_10: "boss2_10.webp",
    boss2_11: "boss2_11.webp",
    boss2_12: "boss2_12.webp",
    boss2_13: "boss2_13.webp",
    boss2_14: "boss2_14.webp",
    boss2_15: "boss2_15.webp",
    boss2_16: "boss2_16.webp",
    boss2_17: "boss2_17.webp",
    boss2_18: "boss2_18.webp",
    boss2_19: "boss2_19.webp",
    boss2_20: "boss2_20.webp",
    boss2_21: "boss2_21.webp",
    boss2_22: "boss2_22.webp",
    boss2_23: "boss2_23.webp",
    boss2_24: "boss2_24.webp",
    boss2_25: "boss2_25.webp",
    boss2_26: "boss2_26.webp",
    boss2_27: "boss2_27.webp",
    boss2_28: "boss2_28.webp",
    boss2_29: "boss2_29.webp",
    boss2_30: "boss2_30.webp",
    boss2_31: "boss2_31.webp",
    boss2_32: "boss2_32.webp",
    boss2_33: "boss2_33.webp",
    boss2_34: "boss2_34.webp",
    boss2_35: "boss2_35.webp",
    boss2_36: "boss2_36.webp",
    rocket:          "rocket.webp?cb=2",
    rocket_flight_01: "rocket_flight_01.webp?cb=2",
    rocket_flight_02: "rocket_flight_02.webp?cb=2",
    rocket_flight_03: "rocket_flight_03.webp?cb=2",
    rocket_flight_04: "rocket_flight_04.webp?cb=2",
    rocket_flight_05: "rocket_flight_05.webp?cb=2",
    rocket_flight_06: "rocket_flight_06.webp?cb=2",
    rocket_flight_07: "rocket_flight_07.webp?cb=2",
    rocket_flight_08: "rocket_flight_08.webp?cb=2",
    rocket_flight_09: "rocket_flight_09.webp?cb=2",
    rocket_flight_10: "rocket_flight_10.webp?cb=2",
    rocket_flight_11: "rocket_flight_11.webp?cb=2",
    rocket_flight_12: "rocket_flight_12.webp?cb=2",
    rocket_flight_13: "rocket_flight_13.webp?cb=2",
    rocket_flight_14: "rocket_flight_14.webp?cb=2",
    rocket_flight_15: "rocket_flight_15.webp?cb=2",
    rocket_flight_16: "rocket_flight_16.webp?cb=2",
    rocket_flight_17: "rocket_flight_17.webp?cb=2",
    rocket_flight_18: "rocket_flight_18.webp?cb=2",
    rocket_flight_19: "rocket_flight_19.webp?cb=2",
    rocket_flight_20: "rocket_flight_20.webp?cb=2",
    rocket_flight_21: "rocket_flight_21.webp?cb=2",
    rocket_flight_22: "rocket_flight_22.webp?cb=2",
    rocket_flight_23: "rocket_flight_23.webp?cb=2",
    rocket_flight_24: "rocket_flight_24.webp?cb=2",
    rocket_flight_25: "rocket_flight_25.webp?cb=2",
    boss4_rocket_flight_01: "boss4_rocket_flight_01.webp",
    boss4_rocket_flight_02: "boss4_rocket_flight_02.webp",
    boss4_rocket_flight_03: "boss4_rocket_flight_03.webp",
    boss4_rocket_flight_04: "boss4_rocket_flight_04.webp",
    boss4_rocket_flight_05: "boss4_rocket_flight_05.webp",
    boss4_rocket_flight_06: "boss4_rocket_flight_06.webp",
    boss4_rocket_flight_07: "boss4_rocket_flight_07.webp",
    boss4_rocket_flight_08: "boss4_rocket_flight_08.webp",
    boss4_rocket_flight_09: "boss4_rocket_flight_09.webp",
    boss4_rocket_flight_10: "boss4_rocket_flight_10.webp",
    boss4_rocket_flight_11: "boss4_rocket_flight_11.webp",
    boss4_rocket_flight_12: "boss4_rocket_flight_12.webp",
    boss4_rocket_flight_13: "boss4_rocket_flight_13.webp",
    boss4_rocket_flight_14: "boss4_rocket_flight_14.webp",
    boss4_rocket_flight_15: "boss4_rocket_flight_15.webp",
    boss4_rocket_flight_16: "boss4_rocket_flight_16.webp",
    boss4_rocket_flight_17: "boss4_rocket_flight_17.webp",
    boss4_rocket_flight_18: "boss4_rocket_flight_18.webp",
    boss4_rocket_flight_19: "boss4_rocket_flight_19.webp",
    boss4_rocket_flight_20: "boss4_rocket_flight_20.webp",
    boss4_rocket_flight_21: "boss4_rocket_flight_21.webp",
    boss4_rocket_flight_22: "boss4_rocket_flight_22.webp",
    boss4_rocket_flight_23: "boss4_rocket_flight_23.webp",
    boss4_rocket_flight_24: "boss4_rocket_flight_24.webp",
    boss4_rocket_flight_25: "boss4_rocket_flight_25.webp",
    heartPickup:     "heartPickup.webp?cb=2",
    bomb:            "bomb.webp?cb=2",
    boss3_shell:     "IMG_0760.png?cb=3",
    bomb_blimp1:     "IMG_0757.png",
    bomb_blimp2:     "IMG_0758.png",
    bomb_blimp3:     "IMG_0756.png",
    bomb_blimp4:     "IMG_0755.png",
    boss_throw_01: "boss_throw_01.webp?cb=2",
    boss_throw_02: "boss_throw_02.webp?cb=2",
    boss_throw_03: "boss_throw_03.webp?cb=2",
    boss_throw_04: "boss_throw_04.webp?cb=2",
    boss_throw_05: "boss_throw_05.webp?cb=2",
    boss_throw_06: "boss_throw_06.webp?cb=2",
    boss_throw_07: "boss_throw_07.webp?cb=2",
    boss_throw_08: "boss_throw_08.webp?cb=2",
    boss_throw_09: "boss_throw_09.webp?cb=2",
    boss_throw_10: "boss_throw_10.webp?cb=2",
    boss_throw_11: "boss_throw_11.webp?cb=2",
    boss_throw_12: "boss_throw_12.webp?cb=2",
    boss_throw_13: "boss_throw_13.webp?cb=2",
    boss_throw_14: "boss_throw_14.webp?cb=2",
    boss_throw_15: "boss_throw_15.webp?cb=2",
    boss_throw_16: "boss_throw_16.webp?cb=2",
    boss_throw_17: "boss_throw_17.webp?cb=2",
    boss_throw_18: "boss_throw_18.webp?cb=2",
    boss_throw_19: "boss_throw_19.webp?cb=2",
    boss_throw_20: "boss_throw_20.webp?cb=2",
    boss_throw_21: "boss_throw_21.webp?cb=2",
    boss_throw_22: "boss_throw_22.webp?cb=2",
    boss_throw_23: "boss_throw_23.webp?cb=2",
    boss_throw_24: "boss_throw_24.webp?cb=2",
    boss_throw_25: "boss_throw_25.webp?cb=2",
    boss_throw_26: "boss_throw_26.webp?cb=2",
    boss_throw_27: "boss_throw_27.webp?cb=2",
    boss_throw_28: "boss_throw_28.webp?cb=2",
    boss_throw_29: "boss_throw_29.webp?cb=2",
    boss_throw_30: "boss_throw_30.webp?cb=2",
    boss_throw_31: "boss_throw_31.webp?cb=2",
    boss_throw_32: "boss_throw_32.webp?cb=2",
    boss_throw_33: "boss_throw_33.webp?cb=2",
    boss_throw_34: "boss_throw_34.webp?cb=2",
    boss_throw_35: "boss_throw_35.webp?cb=2",
    boss_throw_36: "boss_throw_36.webp?cb=2",
    player_blimp_01: "player_blimp_01.webp?cb=3",
    player_blimp_02: "player_blimp_02.webp?cb=3",
    player_blimp_03: "player_blimp_03.webp?cb=3",
    player_blimp_04: "player_blimp_04.webp?cb=3",
    player_blimp_05: "player_blimp_05.webp?cb=3",
    player_blimp_06: "player_blimp_06.webp?cb=3",
    player_blimp_07: "player_blimp_07.webp?cb=3",
    player_blimp_08: "player_blimp_08.webp?cb=3",
    player_blimp_09: "player_blimp_09.webp?cb=3",
    player_blimp_10: "player_blimp_10.webp?cb=3",
    player_blimp_11: "player_blimp_11.webp?cb=3",
    player_blimp_12: "player_blimp_12.webp?cb=3",
    player_blimp_13: "player_blimp_13.webp?cb=3",
    player_blimp_14: "player_blimp_14.webp?cb=3",
    player_blimp_15: "player_blimp_15.webp?cb=3",
    player_blimp_16: "player_blimp_16.webp?cb=3",
    player_blimp_17: "player_blimp_17.webp?cb=3",
    player_blimp_18: "player_blimp_18.webp?cb=3",
    player_blimp_19: "player_blimp_19.webp?cb=3",
    player_blimp_20: "player_blimp_20.webp?cb=3",
    player_blimp_21: "player_blimp_21.webp?cb=3",
    player_blimp_22: "player_blimp_22.webp?cb=3",
    player_blimp_23: "player_blimp_23.webp?cb=3",
    player_blimp_24: "player_blimp_24.webp?cb=3",
    player_blimp_25: "player_blimp_25.webp?cb=3",
    player_blimp_26: "player_blimp_26.webp?cb=3",
    player_blimp_27: "player_blimp_27.webp?cb=3",
    player_blimp_28: "player_blimp_28.webp?cb=3",
    player_blimp_29: "player_blimp_29.webp?cb=3",
    player_blimp_30: "player_blimp_30.webp?cb=3",
    player_blimp_31: "player_blimp_31.webp?cb=3",
    player_blimp_32: "player_blimp_32.webp?cb=3",
    player_blimp_33: "player_blimp_33.webp?cb=3",
    player_blimp_34: "player_blimp_34.webp?cb=3",
    player_blimp_35: "player_blimp_35.webp?cb=3",
    player_blimp_36: "player_blimp_36.webp?cb=3",
    bird_gull_sheet: "bird_gull_sheet.webp?v=ruff346",
    bird_bluebird_sheet: "bird_bluebird_sheet.webp?v=ruff346",
    bird_owl_sheet: "bird_owl_sheet.webp?v=ruff346",
    bird_toucan_sheet: "bird_toucan_sheet.webp?v=ruff346",
    bird_cardinal_sheet: "bird_cardinal_sheet.webp?v=ruff346",
    bird_eagle_sheet: "bird_eagle_sheet.webp?v=ruff346",
    bird_sparrow_sheet: "bird_sparrow_sheet.webp?v=ruff346",
    bird_flamingo_sheet: "bird_flamingo_sheet.webp?v=ruff346",
    bird_a_01: "bird_a_01.webp?cb=2",
    bird_a_02: "bird_a_02.webp?cb=2",
    bird_a_03: "bird_a_03.webp?cb=2",
    bird_a_04: "bird_a_04.webp?cb=2",
    bird_a_05: "bird_a_05.webp?cb=2",
    bird_a_06: "bird_a_06.webp?cb=2",
    bird_a_07: "bird_a_07.webp?cb=2",
    bird_a_08: "bird_a_08.webp?cb=2",
    bird_a_09: "bird_a_09.webp?cb=2",
    bird_a_10: "bird_a_10.webp?cb=2",
    bird_a_11: "bird_a_11.webp?cb=2",
    bird_a_12: "bird_a_12.webp?cb=2",
    bird_a_13: "bird_a_13.webp?cb=2",
    bird_a_14: "bird_a_14.webp?cb=2",
    bird_a_15: "bird_a_15.webp?cb=2",
    bird_a_16: "bird_a_16.webp?cb=2",
    bird_a_17: "bird_a_17.webp?cb=2",
    bird_a_18: "bird_a_18.webp?cb=2",
    bird_a_19: "bird_a_19.webp?cb=2",
    bird_a_20: "bird_a_20.webp?cb=2",
    bird_a_21: "bird_a_21.webp?cb=2",
    bird_a_22: "bird_a_22.webp?cb=2",
    bird_a_23: "bird_a_23.webp?cb=2",
    bird_a_24: "bird_a_24.webp?cb=2",
    bird_a_25: "bird_a_25.webp?cb=2",
    bird_a_26: "bird_a_26.webp?cb=2",
    bird_a_27: "bird_a_27.webp?cb=2",
    bird_a_28: "bird_a_28.webp?cb=2",
    bird_a_29: "bird_a_29.webp?cb=2",
    bird_a_30: "bird_a_30.webp?cb=2",
    bird_a_31: "bird_a_31.webp?cb=2",
    bird_a_32: "bird_a_32.webp?cb=2",
    bird_a_33: "bird_a_33.webp?cb=2",
    bird_a_34: "bird_a_34.webp?cb=2",
    bird_a_35: "bird_a_35.webp?cb=2",
    bird_a_36: "bird_a_36.webp?cb=2",
    bird_b_01: "bird_b_01.webp?cb=2",
    bird_b_02: "bird_b_02.webp?cb=2",
    bird_b_03: "bird_b_03.webp?cb=2",
    bird_b_04: "bird_b_04.webp?cb=2",
    bird_b_05: "bird_b_05.webp?cb=2",
    bird_b_06: "bird_b_06.webp?cb=2",
    bird_b_07: "bird_b_07.webp?cb=2",
    bird_b_08: "bird_b_08.webp?cb=2",
    bird_b_09: "bird_b_09.webp?cb=2",
    bird_b_10: "bird_b_10.webp?cb=2",
    bird_b_11: "bird_b_11.webp?cb=2",
    bird_b_12: "bird_b_12.webp?cb=2",
    bird_b_13: "bird_b_13.webp?cb=2",
    bird_b_14: "bird_b_14.webp?cb=2",
    bird_b_15: "bird_b_15.webp?cb=2",
    bird_b_16: "bird_b_16.webp?cb=2",
    bird_b_17: "bird_b_17.webp?cb=2",
    bird_b_18: "bird_b_18.webp?cb=2",
    bird_b_19: "bird_b_19.webp?cb=2",
    bird_b_20: "bird_b_20.webp?cb=2",
    bird_b_21: "bird_b_21.webp?cb=2",
    bird_b_22: "bird_b_22.webp?cb=2",
    bird_b_23: "bird_b_23.webp?cb=2",
    bird_b_24: "bird_b_24.webp?cb=2",
    bird_b_25: "bird_b_25.webp?cb=2",
    bird_b_26: "bird_b_26.webp?cb=2",
    bird_b_27: "bird_b_27.webp?cb=2",
    bird_b_28: "bird_b_28.webp?cb=2",
    bird_b_29: "bird_b_29.webp?cb=2",
    bird_b_30: "bird_b_30.webp?cb=2",
    bird_b_31: "bird_b_31.webp?cb=2",
    bird_b_32: "bird_b_32.webp?cb=2",
    bird_b_33: "bird_b_33.webp?cb=2",
    bird_b_34: "bird_b_34.webp?cb=2",
    bird_b_35: "bird_b_35.webp?cb=2",
    bird_b_36: "bird_b_36.webp?cb=2",
    balloon_anim_01: "balloon_anim_01.webp?cb=2",
    balloon_anim_02: "balloon_anim_02.webp?cb=2",
    balloon_anim_03: "balloon_anim_03.webp?cb=2",
    balloon_anim_04: "balloon_anim_04.webp?cb=2",
    balloon_anim_05: "balloon_anim_05.webp?cb=2",
    balloon_anim_06: "balloon_anim_06.webp?cb=2",
    balloon_anim_07: "balloon_anim_07.webp?cb=2",
    balloon_anim_08: "balloon_anim_08.webp?cb=2",
    balloon_anim_09: "balloon_anim_09.webp?cb=2",
    balloon_anim_10: "balloon_anim_10.webp?cb=2",
    balloon_anim_11: "balloon_anim_11.webp?cb=2",
    balloon_anim_12: "balloon_anim_12.webp?cb=2",
    balloon_anim_13: "balloon_anim_13.webp?cb=2",
    balloon_anim_14: "balloon_anim_14.webp?cb=2",
    balloon_anim_15: "balloon_anim_15.webp?cb=2",
    balloon_anim_16: "balloon_anim_16.webp?cb=2",
    balloon_anim_17: "balloon_anim_17.webp?cb=2",
    balloon_anim_18: "balloon_anim_18.webp?cb=2",
    balloon_anim_19: "balloon_anim_19.webp?cb=2",
    balloon_anim_20: "balloon_anim_20.webp?cb=2",
    balloon_anim_21: "balloon_anim_21.webp?cb=2",
    balloon_anim_22: "balloon_anim_22.webp?cb=2",
    balloon_anim_23: "balloon_anim_23.webp?cb=2",
    balloon_anim_24: "balloon_anim_24.webp?cb=2",
    balloon_anim_25: "balloon_anim_25.webp?cb=2",
    balloon_anim_26: "balloon_anim_26.webp?cb=2",
    balloon_anim_27: "balloon_anim_27.webp?cb=2",
    balloon_anim_28: "balloon_anim_28.webp?cb=2",
    balloon_anim_29: "balloon_anim_29.webp?cb=2",
    balloon_anim_30: "balloon_anim_30.webp?cb=2",
    balloon_anim_31: "balloon_anim_31.webp?cb=2",
    balloon_anim_32: "balloon_anim_32.webp?cb=2",
    balloon_anim_33: "balloon_anim_33.webp?cb=2",
    balloon_anim_34: "balloon_anim_34.webp?cb=2",
    balloon_anim_35: "balloon_anim_35.webp?cb=2",
    balloon_anim_36: "balloon_anim_36.webp?cb=2",
    boss3:      "boss3_01.webp?cb=3",
    boss3_01: "boss3_01.webp?cb=3",
    boss3_02: "boss3_02.webp?cb=3",
    boss3_03: "boss3_03.webp?cb=3",
    boss3_04: "boss3_04.webp?cb=3",
    boss3_05: "boss3_05.webp?cb=3",
    boss3_06: "boss3_06.webp?cb=3",
    boss3_07: "boss3_07.webp?cb=3",
    boss3_08: "boss3_08.webp?cb=3",
    boss3_09: "boss3_09.webp?cb=3",
    boss3_10: "boss3_10.webp?cb=3",
    boss3_11: "boss3_11.webp?cb=3",
    boss3_12: "boss3_12.webp?cb=3",
    boss3_13: "boss3_13.webp?cb=3",
    boss3_14: "boss3_14.webp?cb=3",
    boss3_15: "boss3_15.webp?cb=3",
    boss3_16: "boss3_16.webp?cb=3",
    boss3_17: "boss3_17.webp?cb=3",
    boss3_18: "boss3_18.webp?cb=3",
    boss3_19: "boss3_19.webp?cb=3",
    boss3_20: "boss3_20.webp?cb=3",
    boss3_21: "boss3_21.webp?cb=3",
    boss3_22: "boss3_22.webp?cb=3",
    boss3_23: "boss3_23.webp?cb=3",
    boss3_24: "boss3_24.webp?cb=3",
    boss3_25: "boss3_25.webp?cb=3",
    boss3_26: "boss3_26.webp?cb=3",
    boss3_27: "boss3_27.webp?cb=3",
    boss3_28: "boss3_28.webp?cb=3",
    boss3_29: "boss3_29.webp?cb=3",
    boss3_30: "boss3_30.webp?cb=3",
    boss3_31: "boss3_31.webp?cb=3",
    boss3_32: "boss3_32.webp?cb=3",
    boss3_33: "boss3_33.webp?cb=3",
    boss3_34: "boss3_34.webp?cb=3",
    boss3_35: "boss3_35.webp?cb=3",
    boss3_36: "boss3_36.webp?cb=3",
    boss4:      "boss4.webp?cb=2",
    boss4_01: "boss4_01.webp",
    boss4_02: "boss4_02.webp",
    boss4_03: "boss4_03.webp",
    boss4_04: "boss4_04.webp",
    boss4_05: "boss4_05.webp",
    boss4_06: "boss4_06.webp",
    boss4_07: "boss4_07.webp",
    boss4_08: "boss4_08.webp",
    boss4_09: "boss4_09.webp",
    boss4_10: "boss4_10.webp",
    boss4_11: "boss4_11.webp",
    boss4_12: "boss4_12.webp",
    boss4_13: "boss4_13.webp",
    boss4_14: "boss4_14.webp",
    boss4_15: "boss4_15.webp",
    boss4_16: "boss4_16.webp",
    boss4_17: "boss4_17.webp",
    boss4_18: "boss4_18.webp",
    boss4_19: "boss4_19.webp",
    boss4_20: "boss4_20.webp",
    boss4_21: "boss4_21.webp",
    boss4_22: "boss4_22.webp",
    boss4_23: "boss4_23.webp",
    boss4_24: "boss4_24.webp",
    boss4_25: "boss4_25.webp",
    boss4_26: "boss4_26.webp",
    boss4_27: "boss4_27.webp",
    boss4_28: "boss4_28.webp",
    boss4_29: "boss4_29.webp",
    boss4_30: "boss4_30.webp",
    boss4_31: "boss4_31.webp",
    boss4_32: "boss4_32.webp",
    boss4_33: "boss4_33.webp",
    boss4_34: "boss4_34.webp",
    boss4_35: "boss4_35.webp",
    boss4_36: "boss4_36.webp",
    boss5:      "boss5.webp?cb=2",
    mini_blimp: "mini_blimp.webp?cb=2",
    mini_blimp2_01: "mini_blimp2_01.webp",
    mini_blimp2_02: "mini_blimp2_02.webp",
    mini_blimp2_03: "mini_blimp2_03.webp",
    mini_blimp2_04: "mini_blimp2_04.webp",
    mini_blimp2_05: "mini_blimp2_05.webp",
    mini_blimp2_06: "mini_blimp2_06.webp",
    mini_blimp2_07: "mini_blimp2_07.webp",
    mini_blimp2_08: "mini_blimp2_08.webp",
    mini_blimp2_09: "mini_blimp2_09.webp",
    mini_blimp2_10: "mini_blimp2_10.webp",
    mini_blimp2_11: "mini_blimp2_11.webp",
    mini_blimp2_12: "mini_blimp2_12.webp",
    mini_blimp2_13: "mini_blimp2_13.webp",
    mini_blimp2_14: "mini_blimp2_14.webp",
    mini_blimp2_15: "mini_blimp2_15.webp",
    mini_blimp2_16: "mini_blimp2_16.webp",
    mini_blimp2_17: "mini_blimp2_17.webp",
    mini_blimp2_18: "mini_blimp2_18.webp",
    mini_blimp2_19: "mini_blimp2_19.webp",
    mini_blimp2_20: "mini_blimp2_20.webp",
    mini_blimp2_21: "mini_blimp2_21.webp",
    mini_blimp2_22: "mini_blimp2_22.webp",
    mini_blimp2_23: "mini_blimp2_23.webp",
    mini_blimp2_24: "mini_blimp2_24.webp",
    mini_blimp2_25: "mini_blimp2_25.webp",
    mini_blimp2_26: "mini_blimp2_26.webp",
    mini_blimp2_27: "mini_blimp2_27.webp",
    mini_blimp2_28: "mini_blimp2_28.webp",
    mini_blimp2_29: "mini_blimp2_29.webp",
    mini_blimp2_30: "mini_blimp2_30.webp",
    mini_blimp2_31: "mini_blimp2_31.webp",
    mini_blimp2_32: "mini_blimp2_32.webp",
    mini_blimp2_33: "mini_blimp2_33.webp",
    mini_blimp2_34: "mini_blimp2_34.webp",
    mini_blimp2_35: "mini_blimp2_35.webp",
    mini_blimp2_36: "mini_blimp2_36.webp",
    mini_tank:  "mini_tank.webp?cb=2",
    mini_tank_01: "mini_tank_01.webp",
    mini_tank_02: "mini_tank_02.webp",
    mini_tank_03: "mini_tank_03.webp",
    mini_tank_04: "mini_tank_04.webp",
    mini_tank_05: "mini_tank_05.webp",
    mini_tank_06: "mini_tank_06.webp",
    mini_tank_07: "mini_tank_07.webp",
    mini_tank_08: "mini_tank_08.webp",
    mini_tank_09: "mini_tank_09.webp",
    mini_tank_10: "mini_tank_10.webp",
    mini_tank_11: "mini_tank_11.webp",
    mini_tank_12: "mini_tank_12.webp",
    mini_tank_13: "mini_tank_13.webp",
    mini_tank_14: "mini_tank_14.webp",
    mini_tank_15: "mini_tank_15.webp",
    mini_tank_16: "mini_tank_16.webp",
    mini_tank_17: "mini_tank_17.webp",
    mini_tank_18: "mini_tank_18.webp",
    mini_tank_19: "mini_tank_19.webp",
    mini_tank_20: "mini_tank_20.webp",
    mini_tank_21: "mini_tank_21.webp",
    mini_tank_22: "mini_tank_22.webp",
    mini_tank_23: "mini_tank_23.webp",
    mini_tank_24: "mini_tank_24.webp",
    mini_tank_25: "mini_tank_25.webp",
    mini_tank_26: "mini_tank_26.webp",
    mini_tank_27: "mini_tank_27.webp",
    mini_tank_28: "mini_tank_28.webp",
    mini_tank_29: "mini_tank_29.webp",
    mini_tank_30: "mini_tank_30.webp",
    mini_tank_31: "mini_tank_31.webp",
    mini_tank_32: "mini_tank_32.webp",
    mini_tank_33: "mini_tank_33.webp",
    mini_tank_34: "mini_tank_34.webp",
    mini_tank_35: "mini_tank_35.webp",
    mini_tank_36: "mini_tank_36.webp",
    mini_heli:  "mini_heli.webp?cb=2",
    mini_heli_01: "mini_heli_01.webp",
    mini_heli_02: "mini_heli_02.webp",
    mini_heli_03: "mini_heli_03.webp",
    mini_heli_04: "mini_heli_04.webp",
    mini_heli_05: "mini_heli_05.webp",
    mini_heli_06: "mini_heli_06.webp",
    mini_heli_07: "mini_heli_07.webp",
    mini_heli_08: "mini_heli_08.webp",
    mini_heli_09: "mini_heli_09.webp",
    mini_heli_10: "mini_heli_10.webp",
    mini_heli_11: "mini_heli_11.webp",
    mini_heli_12: "mini_heli_12.webp",
    mini_heli_13: "mini_heli_13.webp",
    mini_heli_14: "mini_heli_14.webp",
    mini_heli_15: "mini_heli_15.webp",
    mini_heli_16: "mini_heli_16.webp",
    mini_heli_17: "mini_heli_17.webp",
    mini_heli_18: "mini_heli_18.webp",
    mini_heli_19: "mini_heli_19.webp",
    mini_heli_20: "mini_heli_20.webp",
    mini_heli_21: "mini_heli_21.webp",
    mini_heli_22: "mini_heli_22.webp",
    mini_heli_23: "mini_heli_23.webp",
    mini_heli_24: "mini_heli_24.webp",
    mini_heli_25: "mini_heli_25.webp",
    mini_heli_26: "mini_heli_26.webp",
    mini_heli_27: "mini_heli_27.webp",
    mini_heli_28: "mini_heli_28.webp",
    mini_heli_29: "mini_heli_29.webp",
    mini_heli_30: "mini_heli_30.webp",
    mini_heli_31: "mini_heli_31.webp",
    mini_heli_32: "mini_heli_32.webp",
    mini_heli_33: "mini_heli_33.webp",
    mini_heli_34: "mini_heli_34.webp",
    mini_heli_35: "mini_heli_35.webp",
    mini_heli_36: "mini_heli_36.webp",
    mini_ebomb: "mini_ebomb.webp?cb=2",
    shieldPickup: "shieldPickup.webp?cb=2",

    // single static "hero" image per blimp choice — used in gameplay for any
    // blimp that doesn't have its own 36-frame flight animation yet
    asset_extra_06: "asset_extra_06.webp?cb=2",
    blimp2_main:    "blimp2_main.webp?cb=2",
    blimp3_main:    "blimp3_main.webp?cb=2",
    blimp4_main:    "blimp4_main.webp?cb=2",
    ship_petro:     "ship_petro.png",
    landing_pad:    "landing_pad.webp",
    medal_badge:   "medal_badge.webp",
    ship_pirate_rocket: "ship_pirate_rocket.webp",
    ship_military_shark: "ship_military_shark.webp",
    ship_steel_industrial: "ship_steel_industrial.webp",
    ship_red_royal: "ship_red_royal.webp",
    ship_navy_rocket: "ship_navy_rocket.webp",
    blimp5_flight_01: "blimp5_flight_01.webp",
    blimp5_flight_02: "blimp5_flight_02.webp",
    blimp5_flight_03: "blimp5_flight_03.webp",
    blimp5_flight_04: "blimp5_flight_04.webp",
    blimp5_flight_05: "blimp5_flight_05.webp",
    blimp5_flight_06: "blimp5_flight_06.webp",
    blimp5_flight_07: "blimp5_flight_07.webp",
    blimp5_flight_08: "blimp5_flight_08.webp",
    blimp5_flight_09: "blimp5_flight_09.webp",
    blimp5_flight_10: "blimp5_flight_10.webp",
    blimp5_flight_11: "blimp5_flight_11.webp",
    blimp5_flight_12: "blimp5_flight_12.webp",
    blimp5_flight_13: "blimp5_flight_13.webp",
    blimp5_flight_14: "blimp5_flight_14.webp",
    blimp5_flight_15: "blimp5_flight_15.webp",
    blimp5_flight_16: "blimp5_flight_16.webp",
    blimp5_flight_17: "blimp5_flight_17.webp",
    blimp5_flight_18: "blimp5_flight_18.webp",
    blimp5_flight_19: "blimp5_flight_19.webp",
    blimp5_flight_20: "blimp5_flight_20.webp",
    blimp5_flight_21: "blimp5_flight_21.webp",
    blimp5_flight_22: "blimp5_flight_22.webp",
    blimp5_flight_23: "blimp5_flight_23.webp",
    blimp5_flight_24: "blimp5_flight_24.webp",
    blimp5_flight_25: "blimp5_flight_25.webp",
    blimp5_flight_26: "blimp5_flight_26.webp",
    blimp5_flight_27: "blimp5_flight_27.webp",
    blimp5_flight_28: "blimp5_flight_28.webp",
    blimp5_flight_29: "blimp5_flight_29.webp",
    blimp5_flight_30: "blimp5_flight_30.webp",
    blimp5_flight_31: "blimp5_flight_31.webp",
    blimp5_flight_32: "blimp5_flight_32.webp",
    blimp5_flight_33: "blimp5_flight_33.webp",
    blimp5_flight_34: "blimp5_flight_34.webp",
    blimp5_flight_35: "blimp5_flight_35.webp",
    blimp5_flight_36: "blimp5_flight_36.webp",
    blimp11_flight_01: "blimp11_flight_01.webp",
    blimp11_flight_02: "blimp11_flight_02.webp",
    blimp11_flight_03: "blimp11_flight_03.webp",
    blimp11_flight_04: "blimp11_flight_04.webp",
    blimp11_flight_05: "blimp11_flight_05.webp",
    blimp11_flight_06: "blimp11_flight_06.webp",
    blimp11_flight_07: "blimp11_flight_07.webp",
    blimp11_flight_08: "blimp11_flight_08.webp",
    blimp11_flight_09: "blimp11_flight_09.webp",
    blimp11_flight_10: "blimp11_flight_10.webp",
    blimp11_flight_11: "blimp11_flight_11.webp",
    blimp11_flight_12: "blimp11_flight_12.webp",
    blimp11_flight_13: "blimp11_flight_13.webp",
    blimp11_flight_14: "blimp11_flight_14.webp",
    blimp11_flight_15: "blimp11_flight_15.webp",
    blimp11_flight_16: "blimp11_flight_16.webp",
    blimp11_flight_17: "blimp11_flight_17.webp",
    blimp11_flight_18: "blimp11_flight_18.webp",
    blimp11_flight_19: "blimp11_flight_19.webp",
    blimp11_flight_20: "blimp11_flight_20.webp",
    blimp11_flight_21: "blimp11_flight_21.webp",
    blimp11_flight_22: "blimp11_flight_22.webp",
    blimp11_flight_23: "blimp11_flight_23.webp",
    blimp11_flight_24: "blimp11_flight_24.webp",
    blimp11_flight_25: "blimp11_flight_25.webp",
    blimp11_flight_26: "blimp11_flight_26.webp",
    blimp11_flight_27: "blimp11_flight_27.webp",
    blimp11_flight_28: "blimp11_flight_28.webp",
    blimp11_flight_29: "blimp11_flight_29.webp",
    blimp11_flight_30: "blimp11_flight_30.webp",
    blimp11_flight_31: "blimp11_flight_31.webp",
    blimp11_flight_32: "blimp11_flight_32.webp",
    blimp11_flight_33: "blimp11_flight_33.webp",
    blimp11_flight_34: "blimp11_flight_34.webp",
    blimp11_flight_35: "blimp11_flight_35.webp",
    blimp11_flight_36: "blimp11_flight_36.webp",
    blimp12_flight_01: "blimp12_flight_01.webp",
    blimp12_flight_02: "blimp12_flight_02.webp",
    blimp12_flight_03: "blimp12_flight_03.webp",
    blimp12_flight_04: "blimp12_flight_04.webp",
    blimp12_flight_05: "blimp12_flight_05.webp",
    blimp12_flight_06: "blimp12_flight_06.webp",
    blimp12_flight_07: "blimp12_flight_07.webp",
    blimp12_flight_08: "blimp12_flight_08.webp",
    blimp12_flight_09: "blimp12_flight_09.webp",
    blimp12_flight_10: "blimp12_flight_10.webp",
    blimp12_flight_11: "blimp12_flight_11.webp",
    blimp12_flight_12: "blimp12_flight_12.webp",
    blimp12_flight_13: "blimp12_flight_13.webp",
    blimp12_flight_14: "blimp12_flight_14.webp",
    blimp12_flight_15: "blimp12_flight_15.webp",
    blimp12_flight_16: "blimp12_flight_16.webp",
    blimp12_flight_17: "blimp12_flight_17.webp",
    blimp12_flight_18: "blimp12_flight_18.webp",
    blimp12_flight_19: "blimp12_flight_19.webp",
    blimp12_flight_20: "blimp12_flight_20.webp",
    blimp12_flight_21: "blimp12_flight_21.webp",
    blimp12_flight_22: "blimp12_flight_22.webp",
    blimp12_flight_23: "blimp12_flight_23.webp",
    blimp12_flight_24: "blimp12_flight_24.webp",
    blimp12_flight_25: "blimp12_flight_25.webp",
    blimp12_flight_26: "blimp12_flight_26.webp",
    blimp12_flight_27: "blimp12_flight_27.webp",
    blimp12_flight_28: "blimp12_flight_28.webp",
    blimp12_flight_29: "blimp12_flight_29.webp",
    blimp12_flight_30: "blimp12_flight_30.webp",
    blimp12_flight_31: "blimp12_flight_31.webp",
    blimp12_flight_32: "blimp12_flight_32.webp",
    blimp12_flight_33: "blimp12_flight_33.webp",
    blimp12_flight_34: "blimp12_flight_34.webp",
    blimp12_flight_35: "blimp12_flight_35.webp",
    blimp12_flight_36: "blimp12_flight_36.webp",
    blimp13_flight_01: "blimp13_flight_01.webp",
    blimp13_flight_02: "blimp13_flight_02.webp",
    blimp13_flight_03: "blimp13_flight_03.webp",
    blimp13_flight_04: "blimp13_flight_04.webp",
    blimp13_flight_05: "blimp13_flight_05.webp",
    blimp13_flight_06: "blimp13_flight_06.webp",
    blimp13_flight_07: "blimp13_flight_07.webp",
    blimp13_flight_08: "blimp13_flight_08.webp",
    blimp13_flight_09: "blimp13_flight_09.webp",
    blimp13_flight_10: "blimp13_flight_10.webp",
    blimp13_flight_11: "blimp13_flight_11.webp",
    blimp13_flight_12: "blimp13_flight_12.webp",
    blimp13_flight_13: "blimp13_flight_13.webp",
    blimp13_flight_14: "blimp13_flight_14.webp",
    blimp13_flight_15: "blimp13_flight_15.webp",
    blimp13_flight_16: "blimp13_flight_16.webp",
    blimp13_flight_17: "blimp13_flight_17.webp",
    blimp13_flight_18: "blimp13_flight_18.webp",
    blimp13_flight_19: "blimp13_flight_19.webp",
    blimp13_flight_20: "blimp13_flight_20.webp",
    blimp13_flight_21: "blimp13_flight_21.webp",
    blimp13_flight_22: "blimp13_flight_22.webp",
    blimp13_flight_23: "blimp13_flight_23.webp",
    blimp13_flight_24: "blimp13_flight_24.webp",
    blimp13_flight_25: "blimp13_flight_25.webp",
    blimp13_flight_26: "blimp13_flight_26.webp",
    blimp13_flight_27: "blimp13_flight_27.webp",
    blimp13_flight_28: "blimp13_flight_28.webp",
    blimp13_flight_29: "blimp13_flight_29.webp",
    blimp13_flight_30: "blimp13_flight_30.webp",
    blimp13_flight_31: "blimp13_flight_31.webp",
    blimp13_flight_32: "blimp13_flight_32.webp",
    blimp13_flight_33: "blimp13_flight_33.webp",
    blimp13_flight_34: "blimp13_flight_34.webp",
    blimp13_flight_35: "blimp13_flight_35.webp",
    blimp13_flight_36: "blimp13_flight_36.webp",
    blimp14_flight_01: "blimp14_flight_01.webp",
    blimp14_flight_02: "blimp14_flight_02.webp",
    blimp14_flight_03: "blimp14_flight_03.webp",
    blimp14_flight_04: "blimp14_flight_04.webp",
    blimp14_flight_05: "blimp14_flight_05.webp",
    blimp14_flight_06: "blimp14_flight_06.webp",
    blimp14_flight_07: "blimp14_flight_07.webp",
    blimp14_flight_08: "blimp14_flight_08.webp",
    blimp14_flight_09: "blimp14_flight_09.webp",
    blimp14_flight_10: "blimp14_flight_10.webp",
    blimp14_flight_11: "blimp14_flight_11.webp",
    blimp14_flight_12: "blimp14_flight_12.webp",
    blimp14_flight_13: "blimp14_flight_13.webp",
    blimp14_flight_14: "blimp14_flight_14.webp",
    blimp14_flight_15: "blimp14_flight_15.webp",
    blimp14_flight_16: "blimp14_flight_16.webp",
    blimp14_flight_17: "blimp14_flight_17.webp",
    blimp14_flight_18: "blimp14_flight_18.webp",
    blimp14_flight_19: "blimp14_flight_19.webp",
    blimp14_flight_20: "blimp14_flight_20.webp",
    blimp14_flight_21: "blimp14_flight_21.webp",
    blimp14_flight_22: "blimp14_flight_22.webp",
    blimp14_flight_23: "blimp14_flight_23.webp",
    blimp14_flight_24: "blimp14_flight_24.webp",
    blimp14_flight_25: "blimp14_flight_25.webp",
    blimp14_flight_26: "blimp14_flight_26.webp",
    blimp14_flight_27: "blimp14_flight_27.webp",
    blimp14_flight_28: "blimp14_flight_28.webp",
    blimp14_flight_29: "blimp14_flight_29.webp",
    blimp14_flight_30: "blimp14_flight_30.webp",
    blimp14_flight_31: "blimp14_flight_31.webp",
    blimp14_flight_32: "blimp14_flight_32.webp",
    blimp14_flight_33: "blimp14_flight_33.webp",
    blimp14_flight_34: "blimp14_flight_34.webp",
    blimp14_flight_35: "blimp14_flight_35.webp",
    blimp14_flight_36: "blimp14_flight_36.webp",
    blimp15_flight_01: "blimp15_flight_01.webp",
    blimp15_flight_02: "blimp15_flight_02.webp",
    blimp15_flight_03: "blimp15_flight_03.webp",
    blimp15_flight_04: "blimp15_flight_04.webp",
    blimp15_flight_05: "blimp15_flight_05.webp",
    blimp15_flight_06: "blimp15_flight_06.webp",
    blimp15_flight_07: "blimp15_flight_07.webp",
    blimp15_flight_08: "blimp15_flight_08.webp",
    blimp15_flight_09: "blimp15_flight_09.webp",
    blimp15_flight_10: "blimp15_flight_10.webp",
    blimp15_flight_11: "blimp15_flight_11.webp",
    blimp15_flight_12: "blimp15_flight_12.webp",
    blimp15_flight_13: "blimp15_flight_13.webp",
    blimp15_flight_14: "blimp15_flight_14.webp",
    blimp15_flight_15: "blimp15_flight_15.webp",
    blimp15_flight_16: "blimp15_flight_16.webp",
    blimp15_flight_17: "blimp15_flight_17.webp",
    blimp15_flight_18: "blimp15_flight_18.webp",
    blimp15_flight_19: "blimp15_flight_19.webp",
    blimp15_flight_20: "blimp15_flight_20.webp",
    blimp15_flight_21: "blimp15_flight_21.webp",
    blimp15_flight_22: "blimp15_flight_22.webp",
    blimp15_flight_23: "blimp15_flight_23.webp",
    blimp15_flight_24: "blimp15_flight_24.webp",
    blimp15_flight_25: "blimp15_flight_25.webp",
    blimp15_flight_26: "blimp15_flight_26.webp",
    blimp15_flight_27: "blimp15_flight_27.webp",
    blimp15_flight_28: "blimp15_flight_28.webp",
    blimp15_flight_29: "blimp15_flight_29.webp",
    blimp15_flight_30: "blimp15_flight_30.webp",
    blimp15_flight_31: "blimp15_flight_31.webp",
    blimp15_flight_32: "blimp15_flight_32.webp",
    blimp15_flight_33: "blimp15_flight_33.webp",
    blimp15_flight_34: "blimp15_flight_34.webp",
    blimp15_flight_35: "blimp15_flight_35.webp",
    blimp15_flight_36: "blimp15_flight_36.webp",
    ship_wood:      "ship_wood.png",
    ship_cargo:     "ship_cargo.png",
    ship_ivory:     "ship_ivory.png",

    // blimp2 full 25-frame flight animation
    blimp2_flight_01: "blimp2_flight_01.webp?cb=2",
    blimp2_flight_02: "blimp2_flight_02.webp?cb=2",
    blimp2_flight_03: "blimp2_flight_03.webp?cb=2",
    blimp2_flight_04: "blimp2_flight_04.webp?cb=2",
    blimp2_flight_05: "blimp2_flight_05.webp?cb=2",
    blimp2_flight_06: "blimp2_flight_06.webp?cb=2",
    blimp2_flight_07: "blimp2_flight_07.webp?cb=2",
    blimp2_flight_08: "blimp2_flight_08.webp?cb=2",
    blimp2_flight_09: "blimp2_flight_09.webp?cb=2",
    blimp2_flight_10: "blimp2_flight_10.webp?cb=2",
    blimp2_flight_11: "blimp2_flight_11.webp?cb=2",
    blimp2_flight_12: "blimp2_flight_12.webp?cb=2",
    blimp2_flight_13: "blimp2_flight_13.webp?cb=2",
    blimp2_flight_14: "blimp2_flight_14.webp?cb=2",
    blimp2_flight_15: "blimp2_flight_15.webp?cb=2",
    blimp2_flight_16: "blimp2_flight_16.webp?cb=2",
    blimp2_flight_17: "blimp2_flight_17.webp?cb=2",
    blimp2_flight_18: "blimp2_flight_18.webp?cb=2",
    blimp2_flight_19: "blimp2_flight_19.webp?cb=2",
    blimp2_flight_20: "blimp2_flight_20.webp?cb=2",
    blimp2_flight_21: "blimp2_flight_21.webp?cb=2",
    blimp2_flight_22: "blimp2_flight_22.webp?cb=2",
    blimp2_flight_23: "blimp2_flight_23.webp?cb=2",
    blimp2_flight_24: "blimp2_flight_24.webp?cb=2",
    blimp2_flight_25: "blimp2_flight_25.webp?cb=2",

    // blimp3 full 25-frame flight animation
    blimp3_flight_01: "blimp3_flight_01.webp?cb=2",
    blimp3_flight_02: "blimp3_flight_02.webp?cb=2",
    blimp3_flight_03: "blimp3_flight_03.webp?cb=2",
    blimp3_flight_04: "blimp3_flight_04.webp?cb=2",
    blimp3_flight_05: "blimp3_flight_05.webp?cb=2",
    blimp3_flight_06: "blimp3_flight_06.webp?cb=2",
    blimp3_flight_07: "blimp3_flight_07.webp?cb=2",
    blimp3_flight_08: "blimp3_flight_08.webp?cb=2",
    blimp3_flight_09: "blimp3_flight_09.webp?cb=2",
    blimp3_flight_10: "blimp3_flight_10.webp?cb=2",
    blimp3_flight_11: "blimp3_flight_11.webp?cb=2",
    blimp3_flight_12: "blimp3_flight_12.webp?cb=2",
    blimp3_flight_13: "blimp3_flight_13.webp?cb=2",
    blimp3_flight_14: "blimp3_flight_14.webp?cb=2",
    blimp3_flight_15: "blimp3_flight_15.webp?cb=2",
    blimp3_flight_16: "blimp3_flight_16.webp?cb=2",
    blimp3_flight_17: "blimp3_flight_17.webp?cb=2",
    blimp3_flight_18: "blimp3_flight_18.webp?cb=2",
    blimp3_flight_19: "blimp3_flight_19.webp?cb=2",
    blimp3_flight_20: "blimp3_flight_20.webp?cb=2",
    blimp3_flight_21: "blimp3_flight_21.webp?cb=2",
    blimp3_flight_22: "blimp3_flight_22.webp?cb=2",
    blimp3_flight_23: "blimp3_flight_23.webp?cb=2",
    blimp3_flight_24: "blimp3_flight_24.webp?cb=2",
    blimp3_flight_25: "blimp3_flight_25.webp?cb=2",

    // blimp4 full 25-frame flight animation
    blimp4_flight_01: "blimp4_flight_01.webp?cb=2",
    blimp4_flight_02: "blimp4_flight_02.webp?cb=2",
    blimp4_flight_03: "blimp4_flight_03.webp?cb=2",
    blimp4_flight_04: "blimp4_flight_04.webp?cb=2",
    blimp4_flight_05: "blimp4_flight_05.webp?cb=2",
    blimp4_flight_06: "blimp4_flight_06.webp?cb=2",
    blimp4_flight_07: "blimp4_flight_07.webp?cb=2",
    blimp4_flight_08: "blimp4_flight_08.webp?cb=2",
    blimp4_flight_09: "blimp4_flight_09.webp?cb=2",
    blimp4_flight_10: "blimp4_flight_10.webp?cb=2",
    blimp4_flight_11: "blimp4_flight_11.webp?cb=2",
    blimp4_flight_12: "blimp4_flight_12.webp?cb=2",
    blimp4_flight_13: "blimp4_flight_13.webp?cb=2",
    blimp4_flight_14: "blimp4_flight_14.webp?cb=2",
    blimp4_flight_15: "blimp4_flight_15.webp?cb=2",
    blimp4_flight_16: "blimp4_flight_16.webp?cb=2",
    blimp4_flight_17: "blimp4_flight_17.webp?cb=2",
    blimp4_flight_18: "blimp4_flight_18.webp?cb=2",
    blimp4_flight_19: "blimp4_flight_19.webp?cb=2",
    blimp4_flight_20: "blimp4_flight_20.webp?cb=2",
    blimp4_flight_21: "blimp4_flight_21.webp?cb=2",
    blimp4_flight_22: "blimp4_flight_22.webp?cb=2",
    blimp4_flight_23: "blimp4_flight_23.webp?cb=2",
    blimp4_flight_24: "blimp4_flight_24.webp?cb=2",
    blimp4_flight_25: "blimp4_flight_25.webp?cb=2",
    // ship_lightning full 25-frame flight animation
    ship_lightning_01: "ship_lightning_01.webp",
    ship_lightning_02: "ship_lightning_02.webp",
    ship_lightning_03: "ship_lightning_03.webp",
    ship_lightning_04: "ship_lightning_04.webp",
    ship_lightning_05: "ship_lightning_05.webp",
    ship_lightning_06: "ship_lightning_06.webp",
    ship_lightning_07: "ship_lightning_07.webp",
    ship_lightning_08: "ship_lightning_08.webp",
    ship_lightning_09: "ship_lightning_09.webp",
    ship_lightning_10: "ship_lightning_10.webp",
    ship_lightning_11: "ship_lightning_11.webp",
    ship_lightning_12: "ship_lightning_12.webp",
    ship_lightning_13: "ship_lightning_13.webp",
    ship_lightning_14: "ship_lightning_14.webp",
    ship_lightning_15: "ship_lightning_15.webp",
    ship_lightning_16: "ship_lightning_16.webp",
    ship_lightning_17: "ship_lightning_17.webp",
    ship_lightning_18: "ship_lightning_18.webp",
    ship_lightning_19: "ship_lightning_19.webp",
    ship_lightning_20: "ship_lightning_20.webp",
    ship_lightning_21: "ship_lightning_21.webp",
    ship_lightning_22: "ship_lightning_22.webp",
    ship_lightning_23: "ship_lightning_23.webp",
    ship_lightning_24: "ship_lightning_24.webp",
    ship_lightning_25: "ship_lightning_25.webp",
    // ship_pirate full 36-frame flight animation
    ship_pirate_01: "ship_pirate_01.webp",
    ship_pirate_02: "ship_pirate_02.webp",
    ship_pirate_03: "ship_pirate_03.webp",
    ship_pirate_04: "ship_pirate_04.webp",
    ship_pirate_05: "ship_pirate_05.webp",
    ship_pirate_06: "ship_pirate_06.webp",
    ship_pirate_07: "ship_pirate_07.webp",
    ship_pirate_08: "ship_pirate_08.webp",
    ship_pirate_09: "ship_pirate_09.webp",
    ship_pirate_10: "ship_pirate_10.webp",
    ship_pirate_11: "ship_pirate_11.webp",
    ship_pirate_12: "ship_pirate_12.webp",
    ship_pirate_13: "ship_pirate_13.webp",
    ship_pirate_14: "ship_pirate_14.webp",
    ship_pirate_15: "ship_pirate_15.webp",
    ship_pirate_16: "ship_pirate_16.webp",
    ship_pirate_17: "ship_pirate_17.webp",
    ship_pirate_18: "ship_pirate_18.webp",
    ship_pirate_19: "ship_pirate_19.webp",
    ship_pirate_20: "ship_pirate_20.webp",
    ship_pirate_21: "ship_pirate_21.webp",
    ship_pirate_22: "ship_pirate_22.webp",
    ship_pirate_23: "ship_pirate_23.webp",
    ship_pirate_24: "ship_pirate_24.webp",
    ship_pirate_25: "ship_pirate_25.webp",
    ship_pirate_26: "ship_pirate_26.webp",
    ship_pirate_27: "ship_pirate_27.webp",
    ship_pirate_28: "ship_pirate_28.webp",
    ship_pirate_29: "ship_pirate_29.webp",
    ship_pirate_30: "ship_pirate_30.webp",
    ship_pirate_31: "ship_pirate_31.webp",
    ship_pirate_32: "ship_pirate_32.webp",
    ship_pirate_33: "ship_pirate_33.webp",
    ship_pirate_34: "ship_pirate_34.webp",
    ship_pirate_35: "ship_pirate_35.webp",
    ship_pirate_36: "ship_pirate_36.webp",
    // ship_wood (Little Spy / Brass Chronograph) full 36-frame flight animation
    ship_wood_01: "ship_wood_01.webp",
    ship_wood_02: "ship_wood_02.webp",
    ship_wood_03: "ship_wood_03.webp",
    ship_wood_04: "ship_wood_04.webp",
    ship_wood_05: "ship_wood_05.webp",
    ship_wood_06: "ship_wood_06.webp",
    ship_wood_07: "ship_wood_07.webp",
    ship_wood_08: "ship_wood_08.webp",
    ship_wood_09: "ship_wood_09.webp",
    ship_wood_10: "ship_wood_10.webp",
    ship_wood_11: "ship_wood_11.webp",
    ship_wood_12: "ship_wood_12.webp",
    ship_wood_13: "ship_wood_13.webp",
    ship_wood_14: "ship_wood_14.webp",
    ship_wood_15: "ship_wood_15.webp",
    ship_wood_16: "ship_wood_16.webp",
    ship_wood_17: "ship_wood_17.webp",
    ship_wood_18: "ship_wood_18.webp",
    ship_wood_19: "ship_wood_19.webp",
    ship_wood_20: "ship_wood_20.webp",
    ship_wood_21: "ship_wood_21.webp",
    ship_wood_22: "ship_wood_22.webp",
    ship_wood_23: "ship_wood_23.webp",
    ship_wood_24: "ship_wood_24.webp",
    ship_wood_25: "ship_wood_25.webp",
    ship_wood_26: "ship_wood_26.webp",
    ship_wood_27: "ship_wood_27.webp",
    ship_wood_28: "ship_wood_28.webp",
    ship_wood_29: "ship_wood_29.webp",
    ship_wood_30: "ship_wood_30.webp",
    ship_wood_31: "ship_wood_31.webp",
    ship_wood_32: "ship_wood_32.webp",
    ship_wood_33: "ship_wood_33.webp",
    ship_wood_34: "ship_wood_34.webp",
    ship_wood_35: "ship_wood_35.webp",
    ship_wood_36: "ship_wood_36.webp",
    // ship_ivory (Ivory Anchor) full 36-frame flight animation
    ship_ivory_01: "ship_ivory_01.webp",
    ship_ivory_02: "ship_ivory_02.webp",
    ship_ivory_03: "ship_ivory_03.webp",
    ship_ivory_04: "ship_ivory_04.webp",
    ship_ivory_05: "ship_ivory_05.webp",
    ship_ivory_06: "ship_ivory_06.webp",
    ship_ivory_07: "ship_ivory_07.webp",
    ship_ivory_08: "ship_ivory_08.webp",
    ship_ivory_09: "ship_ivory_09.webp",
    ship_ivory_10: "ship_ivory_10.webp",
    ship_ivory_11: "ship_ivory_11.webp",
    ship_ivory_12: "ship_ivory_12.webp",
    ship_ivory_13: "ship_ivory_13.webp",
    ship_ivory_14: "ship_ivory_14.webp",
    ship_ivory_15: "ship_ivory_15.webp",
    ship_ivory_16: "ship_ivory_16.webp",
    ship_ivory_17: "ship_ivory_17.webp",
    ship_ivory_18: "ship_ivory_18.webp",
    ship_ivory_19: "ship_ivory_19.webp",
    ship_ivory_20: "ship_ivory_20.webp",
    ship_ivory_21: "ship_ivory_21.webp",
    ship_ivory_22: "ship_ivory_22.webp",
    ship_ivory_23: "ship_ivory_23.webp",
    ship_ivory_24: "ship_ivory_24.webp",
    ship_ivory_25: "ship_ivory_25.webp",
    ship_ivory_26: "ship_ivory_26.webp",
    ship_ivory_27: "ship_ivory_27.webp",
    ship_ivory_28: "ship_ivory_28.webp",
    ship_ivory_29: "ship_ivory_29.webp",
    ship_ivory_30: "ship_ivory_30.webp",
    ship_ivory_31: "ship_ivory_31.webp",
    ship_ivory_32: "ship_ivory_32.webp",
    ship_ivory_33: "ship_ivory_33.webp",
    ship_ivory_34: "ship_ivory_34.webp",
    ship_ivory_35: "ship_ivory_35.webp",
    ship_ivory_36: "ship_ivory_36.webp",
    // ship_purple (Petro) full 36-frame flight animation
    ship_purple_01: "ship_purple_01.webp",
    ship_purple_02: "ship_purple_02.webp",
    ship_purple_03: "ship_purple_03.webp",
    ship_purple_04: "ship_purple_04.webp",
    ship_purple_05: "ship_purple_05.webp",
    ship_purple_06: "ship_purple_06.webp",
    ship_purple_07: "ship_purple_07.webp",
    ship_purple_08: "ship_purple_08.webp",
    ship_purple_09: "ship_purple_09.webp",
    ship_purple_10: "ship_purple_10.webp",
    ship_purple_11: "ship_purple_11.webp",
    ship_purple_12: "ship_purple_12.webp",
    ship_purple_13: "ship_purple_13.webp",
    ship_purple_14: "ship_purple_14.webp",
    ship_purple_15: "ship_purple_15.webp",
    ship_purple_16: "ship_purple_16.webp",
    ship_purple_17: "ship_purple_17.webp",
    ship_purple_18: "ship_purple_18.webp",
    ship_purple_19: "ship_purple_19.webp",
    ship_purple_20: "ship_purple_20.webp",
    ship_purple_21: "ship_purple_21.webp",
    ship_purple_22: "ship_purple_22.webp",
    ship_purple_23: "ship_purple_23.webp",
    ship_purple_24: "ship_purple_24.webp",
    ship_purple_25: "ship_purple_25.webp",
    ship_purple_26: "ship_purple_26.webp",
    ship_purple_27: "ship_purple_27.webp",
    ship_purple_28: "ship_purple_28.webp",
    ship_purple_29: "ship_purple_29.webp",
    ship_purple_30: "ship_purple_30.webp",
    ship_purple_31: "ship_purple_31.webp",
    ship_purple_32: "ship_purple_32.webp",
    ship_purple_33: "ship_purple_33.webp",
    ship_purple_34: "ship_purple_34.webp",
    ship_purple_35: "ship_purple_35.webp",
    ship_purple_36: "ship_purple_36.webp",
    // ship_cargo (Cargo King) full 36-frame flight animation
    ship_cargo_01: "ship_cargo_01.webp",
    ship_cargo_02: "ship_cargo_02.webp",
    ship_cargo_03: "ship_cargo_03.webp",
    ship_cargo_04: "ship_cargo_04.webp",
    ship_cargo_05: "ship_cargo_05.webp",
    ship_cargo_06: "ship_cargo_06.webp",
    ship_cargo_07: "ship_cargo_07.webp",
    ship_cargo_08: "ship_cargo_08.webp",
    ship_cargo_09: "ship_cargo_09.webp",
    ship_cargo_10: "ship_cargo_10.webp",
    ship_cargo_11: "ship_cargo_11.webp",
    ship_cargo_12: "ship_cargo_12.webp",
    ship_cargo_13: "ship_cargo_13.webp",
    ship_cargo_14: "ship_cargo_14.webp",
    ship_cargo_15: "ship_cargo_15.webp",
    ship_cargo_16: "ship_cargo_16.webp",
    ship_cargo_17: "ship_cargo_17.webp",
    ship_cargo_18: "ship_cargo_18.webp",
    ship_cargo_19: "ship_cargo_19.webp",
    ship_cargo_20: "ship_cargo_20.webp",
    ship_cargo_21: "ship_cargo_21.webp",
    ship_cargo_22: "ship_cargo_22.webp",
    ship_cargo_23: "ship_cargo_23.webp",
    ship_cargo_24: "ship_cargo_24.webp",
    ship_cargo_25: "ship_cargo_25.webp",
    ship_cargo_26: "ship_cargo_26.webp",
    ship_cargo_27: "ship_cargo_27.webp",
    ship_cargo_28: "ship_cargo_28.webp",
    ship_cargo_29: "ship_cargo_29.webp",
    ship_cargo_30: "ship_cargo_30.webp",
    ship_cargo_31: "ship_cargo_31.webp",
    ship_cargo_32: "ship_cargo_32.webp",
    ship_cargo_33: "ship_cargo_33.webp",
    ship_cargo_34: "ship_cargo_34.webp",
    ship_cargo_35: "ship_cargo_35.webp",
    ship_cargo_36: "ship_cargo_36.webp",
    // Storm cloud animation frames (36 frames) for rain level decorative clouds
    storm_cloud_01: "storm_cloud_01.webp?cb=2",
    storm_cloud_02: "storm_cloud_02.webp?cb=2",
    storm_cloud_03: "storm_cloud_03.webp?cb=2",
    storm_cloud_04: "storm_cloud_04.webp?cb=2",
    storm_cloud_05: "storm_cloud_05.webp?cb=2",
    storm_cloud_06: "storm_cloud_06.webp?cb=2",
    storm_cloud_07: "storm_cloud_07.webp?cb=2",
    storm_cloud_08: "storm_cloud_08.webp?cb=2",
    storm_cloud_09: "storm_cloud_09.webp?cb=2",
    storm_cloud_10: "storm_cloud_10.webp?cb=2",
    storm_cloud_11: "storm_cloud_11.webp?cb=2",
    storm_cloud_12: "storm_cloud_12.webp?cb=2",
    storm_cloud_13: "storm_cloud_13.webp?cb=2",
    storm_cloud_14: "storm_cloud_14.webp?cb=2",
    storm_cloud_15: "storm_cloud_15.webp?cb=2",
    storm_cloud_16: "storm_cloud_16.webp?cb=2",
    storm_cloud_17: "storm_cloud_17.webp?cb=2",
    storm_cloud_18: "storm_cloud_18.webp?cb=2",
    storm_cloud_19: "storm_cloud_19.webp?cb=2",
    storm_cloud_20: "storm_cloud_20.webp?cb=2",
    storm_cloud_21: "storm_cloud_21.webp?cb=2",
    storm_cloud_22: "storm_cloud_22.webp?cb=2",
    storm_cloud_23: "storm_cloud_23.webp?cb=2",
    storm_cloud_24: "storm_cloud_24.webp?cb=2",
    storm_cloud_25: "storm_cloud_25.webp?cb=2",
    storm_cloud_26: "storm_cloud_26.webp?cb=2",
    storm_cloud_27: "storm_cloud_27.webp?cb=2",
    storm_cloud_28: "storm_cloud_28.webp?cb=2",
    storm_cloud_29: "storm_cloud_29.webp?cb=2",
    storm_cloud_30: "storm_cloud_30.webp?cb=2",
    storm_cloud_31: "storm_cloud_31.webp?cb=2",
    storm_cloud_32: "storm_cloud_32.webp?cb=2",
    storm_cloud_33: "storm_cloud_33.webp?cb=2",
    storm_cloud_34: "storm_cloud_34.webp?cb=2",
    storm_cloud_35: "storm_cloud_35.webp?cb=2",
    storm_cloud_36: "storm_cloud_36.webp?cb=2",
    storm_cloud_unique_00: "storm_cloud_unique_00.png",
    storm_cloud_unique_01: "storm_cloud_unique_01.png",
    storm_cloud_unique_02: "storm_cloud_unique_02.png",
    storm_cloud_unique_03: "storm_cloud_unique_03.png",
    storm_cloud_unique_04: "storm_cloud_unique_04.png",
    storm_cloud_unique_05: "storm_cloud_unique_05.png",
    storm_cloud_unique_06: "storm_cloud_unique_06.png",
    storm_cloud_unique_07: "storm_cloud_unique_07.png",
    storm_cloud_unique_08: "storm_cloud_unique_08.png",
    storm_cloud_unique_09: "storm_cloud_unique_09.png",
  };

  const BOSS_THROW_FRAME_COUNT = 36;
  const BOSS_THROW_RELEASE_FRAME = 20; // frame index (1-based) where the bomb leaves his hand — re-timed for the new 36-frame animation (bomb is visibly already gone by frame 20 in the new art)
  const BOSS_THROW_KEYS = Array.from({ length: BOSS_THROW_FRAME_COUNT }, (_, i) => `boss_throw_${String(i + 1).padStart(2, "0")}`);

  const PLAYER_BLIMP_FRAME_COUNT = 36;
  const PLAYER_BLIMP_FPS = 24;
  const PLAYER_BLIMP_KEYS = Array.from({ length: PLAYER_BLIMP_FRAME_COUNT }, (_, i) => `player_blimp_${String(i + 1).padStart(2, "0")}`);

  const BLIMP2_FLIGHT_FRAME_COUNT = 25;
  const BLIMP2_FLIGHT_FPS = 18;
  const BLIMP2_FLIGHT_KEYS = Array.from({ length: BLIMP2_FLIGHT_FRAME_COUNT }, (_, i) => `blimp2_flight_${String(i + 1).padStart(2, "0")}`);

  const BLIMP3_FLIGHT_FRAME_COUNT = 25;
  const BLIMP3_FLIGHT_FPS = 18;
  const BLIMP3_FLIGHT_KEYS = Array.from({ length: BLIMP3_FLIGHT_FRAME_COUNT }, (_, i) => `blimp3_flight_${String(i + 1).padStart(2, "0")}`);

  const BLIMP4_FLIGHT_FRAME_COUNT = 25;
  const BLIMP4_FLIGHT_FPS = 18;
  const BLIMP4_FLIGHT_KEYS = Array.from({ length: BLIMP4_FLIGHT_FRAME_COUNT }, (_, i) => `blimp4_flight_${String(i + 1).padStart(2, "0")}`);

  const SHIP_LIGHTNING_FRAME_COUNT = 25;
  const SHIP_LIGHTNING_FPS = 20;
  const SHIP_LIGHTNING_KEYS = Array.from({ length: SHIP_LIGHTNING_FRAME_COUNT }, (_, i) => `ship_lightning_${String(i + 1).padStart(2, "0")}`);

  const SHIP_PIRATE_FRAME_COUNT = 36;
  const SHIP_PIRATE_FPS = 20;
  const SHIP_PIRATE_KEYS = Array.from({ length: SHIP_PIRATE_FRAME_COUNT }, (_, i) => `ship_pirate_${String(i + 1).padStart(2, "0")}`);

  const SHIP_WOOD_FRAME_COUNT = 36;
  const SHIP_WOOD_FPS = 20;
  const SHIP_WOOD_KEYS = Array.from({ length: SHIP_WOOD_FRAME_COUNT }, (_, i) => `ship_wood_${String(i + 1).padStart(2, "0")}`);

  
  
  const BLIMP5_FLIGHT_FRAME_COUNT = 36;
  const BLIMP5_FLIGHT_FPS = 20;
  const BLIMP5_FLIGHT_KEYS = Array.from({ length: BLIMP5_FLIGHT_FRAME_COUNT }, (_, i) => `blimp5_flight_${String(i + 1).padStart(2, "0")}`);

  const BLIMP11_FLIGHT_FRAME_COUNT = 36;
  const BLIMP11_FLIGHT_FPS = 20;
  const BLIMP11_FLIGHT_KEYS = Array.from({ length: BLIMP11_FLIGHT_FRAME_COUNT }, (_, i) => `blimp11_flight_${String(i + 1).padStart(2, "0")}`);
  const BLIMP12_FLIGHT_FRAME_COUNT = 36;
  const BLIMP12_FLIGHT_FPS = 20;
  const BLIMP12_FLIGHT_KEYS = Array.from({ length: BLIMP12_FLIGHT_FRAME_COUNT }, (_, i) => `blimp12_flight_${String(i + 1).padStart(2, "0")}`);
  const BLIMP13_FLIGHT_FRAME_COUNT = 36;
  const BLIMP13_FLIGHT_FPS = 20;
  const BLIMP13_FLIGHT_KEYS = Array.from({ length: BLIMP13_FLIGHT_FRAME_COUNT }, (_, i) => `blimp13_flight_${String(i + 1).padStart(2, "0")}`);
  const BLIMP14_FLIGHT_FRAME_COUNT = 36;
  const BLIMP14_FLIGHT_FPS = 20;
  const BLIMP14_FLIGHT_KEYS = Array.from({ length: BLIMP14_FLIGHT_FRAME_COUNT }, (_, i) => `blimp14_flight_${String(i + 1).padStart(2, "0")}`);
  const BLIMP15_FLIGHT_FRAME_COUNT = 36;
  const BLIMP15_FLIGHT_FPS = 20;
  const BLIMP15_FLIGHT_KEYS = Array.from({ length: BLIMP15_FLIGHT_FRAME_COUNT }, (_, i) => `blimp15_flight_${String(i + 1).padStart(2, "0")}`);

  const SHIP_IVORY_FRAME_COUNT = 36;
  const SHIP_IVORY_FPS = 20;
  const SHIP_IVORY_KEYS = Array.from({ length: SHIP_IVORY_FRAME_COUNT }, (_, i) => `ship_ivory_${String(i + 1).padStart(2, "0")}`);

  const SHIP_PURPLE_FRAME_COUNT = 36;
  const SHIP_PURPLE_FPS = 20;
  const SHIP_PURPLE_KEYS = Array.from({ length: SHIP_PURPLE_FRAME_COUNT }, (_, i) => `ship_purple_${String(i + 1).padStart(2, "0")}`);

  const SHIP_CARGO_FRAME_COUNT = 36;
  const SHIP_CARGO_FPS = 20;
  const SHIP_CARGO_KEYS = Array.from({ length: SHIP_CARGO_FRAME_COUNT }, (_, i) => `ship_cargo_${String(i + 1).padStart(2, "0")}`);

  // per-blimp animated frame sets — any blimp not listed here falls back to
  // its single static hero image (see BLIMP_HERO_KEYS below)
  const BLIMP_ANIM = {
    blimp1: { keys: PLAYER_BLIMP_KEYS, fps: PLAYER_BLIMP_FPS, frameCount: PLAYER_BLIMP_FRAME_COUNT },
    blimp2: { keys: BLIMP2_FLIGHT_KEYS, fps: BLIMP2_FLIGHT_FPS, frameCount: BLIMP2_FLIGHT_FRAME_COUNT },
    blimp3: { keys: BLIMP3_FLIGHT_KEYS, fps: BLIMP3_FLIGHT_FPS, frameCount: BLIMP3_FLIGHT_FRAME_COUNT },
    blimp4: { keys: BLIMP4_FLIGHT_KEYS, fps: BLIMP4_FLIGHT_FPS, frameCount: BLIMP4_FLIGHT_FRAME_COUNT },
    blimp5: { keys: BLIMP5_FLIGHT_KEYS, fps: BLIMP5_FLIGHT_FPS, frameCount: BLIMP5_FLIGHT_FRAME_COUNT },
    blimp6: { keys: SHIP_WOOD_KEYS, fps: SHIP_WOOD_FPS, frameCount: SHIP_WOOD_FRAME_COUNT },
    blimp7: { keys: SHIP_LIGHTNING_KEYS, fps: SHIP_LIGHTNING_FPS, frameCount: SHIP_LIGHTNING_FRAME_COUNT },
    blimp8: { keys: SHIP_CARGO_KEYS, fps: SHIP_CARGO_FPS, frameCount: SHIP_CARGO_FRAME_COUNT },
    blimp9: { keys: SHIP_PIRATE_KEYS, fps: SHIP_PIRATE_FPS, frameCount: SHIP_PIRATE_FRAME_COUNT },
    blimp10: { keys: SHIP_IVORY_KEYS, fps: SHIP_IVORY_FPS, frameCount: SHIP_IVORY_FRAME_COUNT },
    blimp11: { keys: BLIMP11_FLIGHT_KEYS, fps: BLIMP11_FLIGHT_FPS, frameCount: BLIMP11_FLIGHT_FRAME_COUNT },
    blimp12: { keys: BLIMP12_FLIGHT_KEYS, fps: BLIMP12_FLIGHT_FPS, frameCount: BLIMP12_FLIGHT_FRAME_COUNT },
    blimp13: { keys: BLIMP13_FLIGHT_KEYS, fps: BLIMP13_FLIGHT_FPS, frameCount: BLIMP13_FLIGHT_FRAME_COUNT },
    blimp14: { keys: BLIMP14_FLIGHT_KEYS, fps: BLIMP14_FLIGHT_FPS, frameCount: BLIMP14_FLIGHT_FRAME_COUNT },
    blimp15: { keys: BLIMP15_FLIGHT_KEYS, fps: BLIMP15_FLIGHT_FPS, frameCount: BLIMP15_FLIGHT_FRAME_COUNT }
  };

  // blimp1, blimp2, blimp5, blimp6, blimp7, blimp9 and blimp10 have their own flight animations;
  // everything else only has a single static hero image so far, so gameplay
  // falls back to that
  const BLIMP_HERO_KEYS = {
    blimp1: "player_blimp_01",
    blimp2: "blimp2_flight_01",
    blimp3: "blimp3_flight_01",
    blimp4: "blimp4_flight_01",
    blimp5: "blimp5_flight_01",
    blimp6: "ship_wood_01",
    blimp7: "ship_lightning_01",
    blimp8: "ship_cargo_01",
    blimp9: "ship_pirate_01",
    blimp10: "ship_ivory_01",
    blimp11: "blimp11_flight_01",
    blimp12: "blimp12_flight_01",
    blimp13: "blimp13_flight_01",
    blimp14: "blimp14_flight_01",
    blimp15: "blimp15_flight_01"
  };

  // ---------- Animation frame validation — detect and skip near-blank frames ----------
  // Some frames from the sprite extraction pipeline come out almost fully transparent.
  // This causes the blimp to "vanish" for an instant (~1 per cycle), which reads as a
  // hit flash. We pre-scan each animation frame and build a whitelist of "good" frames.
  const GOOD_FRAMES = {}; // e.g. { blimp1: [0, 1, 3, 4, ...], blimp2: [...] }
  const FRAME_OPACITY_THRESHOLD = 0.03; // minimum ratio of opaque pixels to total pixels

  function validateAnimationFrames() {
    // Skip full-frame opacity scan when the roster is huge — it was blocking
    // load for seconds. Good-frame lists stay empty → runtime uses all frames.
    try {
      const animCount = Object.keys(BLIMP_ANIM || {}).length;
      if (animCount > 12) return;
    } catch (e) {}
    const validateCanvas = document.createElement("canvas");
    const validateCtx = validateCanvas.getContext("2d");

    Object.entries(BLIMP_ANIM).forEach(([blimpName, anim]) => {
      const good = [];
      anim.keys.forEach((key, idx) => {
        const img = images[key];
        if (!img || !img.naturalWidth || !img.naturalHeight) return;

        // Draw to a small thumbnail to check opacity cheaply
        const testW = 64;
        const testH = 64;
        validateCanvas.width = testW;
        validateCanvas.height = testH;
        validateCtx.clearRect(0, 0, testW, testH);
        validateCtx.drawImage(img, 0, 0, testW, testH);

        try {
          const data = validateCtx.getImageData(0, 0, testW, testH).data;
          let opaque = 0;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 30) opaque++;
          }
          const ratio = opaque / (testW * testH);
          if (ratio >= FRAME_OPACITY_THRESHOLD) {
            good.push(idx);
          }
        } catch (e) {
          // CORS tainted canvas — can't read pixels, assume the frame is good
          good.push(idx);
        }
      });

      // If every frame failed validation (e.g. all CORS-blocked), keep them all
      GOOD_FRAMES[blimpName] = good.length > 0 ? good : anim.keys.map((_, i) => i);
    });
  }

  function currentPlayerImage() {
    const sel = typeof selectedBlimp !== "undefined" ? selectedBlimp : "blimp1";
    const anim = BLIMP_ANIM[sel];
    if (anim) {
      const good = GOOD_FRAMES[sel];
      // If we have a validated good-frame list, map the running frame index to a good frame
      if (good && good.length > 0) {
        const mappedFrame = good[playerBlimpFrame % good.length];
        const animImg = images[anim.keys[mappedFrame]];
        if (animImg && animImg.naturalWidth) return animImg;
      }
      // Fallback: unvalidated path (shouldn't happen after load)
      const frame = playerBlimpFrame % anim.frameCount;
      const animImg = images[anim.keys[frame]];
      if (animImg && animImg.naturalWidth) return animImg;
      // Last resort before giving up on this blimp's own animation entirely:
      // scan every frame it has for the first one that's actually loaded. This
      // guards against a bad GOOD_FRAMES mapping ever fully blanking the blimp.
      for (let i = 0; i < anim.keys.length; i++) {
        const img = images[anim.keys[i]];
        if (img && img.naturalWidth) return img;
      }
    }
    // fall back to the static hero image if there's no animation set for
    // this blimp (or its frames haven't loaded)
    const heroKey = BLIMP_HERO_KEYS[sel];
    const heroImg = heroKey && images[heroKey];
    if (heroImg && heroImg.naturalWidth) return heroImg;
    const defaultFrameImg = images[PLAYER_BLIMP_KEYS[playerBlimpFrame]];
    if (defaultFrameImg && defaultFrameImg.naturalWidth) return defaultFrameImg;
    return images.blimp;
  }
  let playerBlimpFrame = 0; // 0-based index into the active blimp's animation keys
  let playerBlimpFrameTimer = 0;

  const OBSTACLE_ANIM_FRAME_COUNT = 36;
  const OBSTACLE_ANIM_FPS = 24;
  const BOSS2_FRAME_KEYS = Array.from({ length: 36 }, (_, i) => `boss2_${String(i + 1).padStart(2, "0")}`);
  const BOSS3_FRAME_KEYS = Array.from({ length: 36 }, (_, i) => `boss3_${String(i + 1).padStart(2, "0")}`);
  const BOSS4_FRAME_KEYS = Array.from({ length: 36 }, (_, i) => `boss4_${String(i + 1).padStart(2, "0")}`);
  const BOSS2_ANIM_FPS = 16;
  const BOSS3_ANIM_FPS = 16;
  const BOSS4_ANIM_FPS = 16;
  const BIRD_A_KEYS = Array.from({ length: OBSTACLE_ANIM_FRAME_COUNT }, (_, i) => `bird_a_${String(i + 1).padStart(2, "0")}`);
  const BIRD_B_KEYS = Array.from({ length: OBSTACLE_ANIM_FRAME_COUNT }, (_, i) => `bird_b_${String(i + 1).padStart(2, "0")}`);
  const BALLOON_ANIM_KEYS = Array.from({ length: OBSTACLE_ANIM_FRAME_COUNT }, (_, i) => `balloon_anim_${String(i + 1).padStart(2, "0")}`);
  // mini lead-in enemies for bosses 2-5 — single static sprite repeated across the
  // frame slots (no per-frame animation art yet), so they still bob/drift normally
  const MINI_BLIMP_KEYS = Array.from({ length: OBSTACLE_ANIM_FRAME_COUNT }, (_, i) => `mini_blimp2_${String(i + 1).padStart(2, "0")}`);
  const MINI_TANK_KEYS = Array.from({ length: OBSTACLE_ANIM_FRAME_COUNT }, (_, i) => `mini_tank_${String(i + 1).padStart(2, "0")}`);
  const MINI_HELI_KEYS = Array.from({ length: OBSTACLE_ANIM_FRAME_COUNT }, (_, i) => `mini_heli_${String(i + 1).padStart(2, "0")}`);
  const MINI_EBOMB_KEYS = Array.from({ length: OBSTACLE_ANIM_FRAME_COUNT }, () => "mini_ebomb");
  const OBSTACLE_ANIM_SETS = {
    bird_a: BIRD_A_KEYS, bird_b: BIRD_B_KEYS, balloon_anim: BALLOON_ANIM_KEYS,
    mini_blimp: MINI_BLIMP_KEYS, mini_tank: MINI_TANK_KEYS, mini_heli: MINI_HELI_KEYS, mini_ebomb: MINI_EBOMB_KEYS
  };

  const BUILDING_KEYS = [
    "bldg_cinema", "bldg_apothecary", "bldg_newspaper",
    "bldg_plain", "bldg_hotel", "bldg_library"
  ];
  const BUILDING_KEYS_L3 = [
    "bldg_l3_factoryrow", "bldg_l3_smokestacks", "bldg_l3_geartower",
    "bldg_l3_clocktower", "bldg_l3_furnacehouse", "bldg_l3_minetower", "bldg_l3_pipeworks"
  ];

  const images = {};
  let assetsLoaded = 0;
  const assetKeys = Object.keys(ASSET_SOURCES);

  let failedAssetKeys = [];

  // if a sprite 404'd, naturalWidth/Height are 0 — fall back instead of NaN cascading through positions/sizes
  function imgAspect(img, fallback) {
    if (img && img.naturalWidth) return img.naturalHeight / img.naturalWidth;
    return fallback != null ? fallback : 0.7;
  }

  // EDGE FEATHER — every sprite is redrawn once through a canvas with a
  // hairline blur applied, then swapped back in as the cached image. This
  // softens the hard/jagged pixel edges the source PNGs show at their
  // scaled-up display sizes, without visibly softening the artwork itself.
  // Runs once per asset at load time (not per-frame), so it's free at runtime.
  function featherSpriteEdges(key, sourceImg, cb) {
    // Always have a usable image for this key from the start — feathering is
    // a pure enhancement, so if anything about it fails we fall back to the
    // original (unfeathered) sprite rather than leaving images[key] unset.
    images[key] = sourceImg;
    try {
      const w = sourceImg.naturalWidth, h = sourceImg.naturalHeight;
      if (!w || !h) { cb(); return; }
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      octx.filter = "blur(0.75px)";
      octx.drawImage(sourceImg, 0, 0, w, h);
      const dataUrl = off.toDataURL("image/png");
      const feathered = new Image();
      feathered.onload = () => { images[key] = feathered; cb(); };
      feathered.onerror = cb; // keep the original sprite already assigned above
      feathered.src = dataUrl;
    } catch (e) {
      cb(); // canvas may be tainted (e.g. CORS) — keep the original sprite already assigned above
    }
  }

  function loadAssets(onDone) {
    assetKeys.forEach(key => {
      const img = new Image();
      if (!PLACEHOLDER_MODE) img.crossOrigin = "anonymous";
      const settle = () => {
        assetsLoaded++;
        if (assetsLoaded === assetKeys.length) {
          validateAnimationFrames();
          onDone();
          if (typeof window.__airborneOnAssetsReady === "function") {
            try { window.__airborneOnAssetsReady(); } catch (e) {}
          }
          if (failedAssetKeys.length) {
            console.warn("Airborne Aces: " + failedAssetKeys.length + " asset(s) missing from the repo, using placeholder art:", failedAssetKeys);
            // on-screen banner disabled for now — check the console list above if something's missing
          }
        }
      };
      img.onload = () => {
        // Skip expensive edge-feather for animation strips / large bg art —
        // feathering 1000+ frames freezes load on mobile and can make the
        // game appear stuck.
        const skipFeather =
          /_flight_|player_blimp_|boss_throw_|boss\d+_|rocket_flight_|ship_(pirate|wood|ivory|purple|cargo|lightning)_\d/.test(key) ||
          /skylineFar|streetrow|Far_Bg|hangar_bg|airborne_aces_map|medal_badge|parallax_mountains|mountains_cutout|airfield_strip|landing_field|wind_flag_left|finish_flag|wind_sock|ruff_|blue_crystal_|cloud_soft_/.test(key);
        if (skipFeather) {
          images[key] = img;
          settle();
        } else {
          featherSpriteEdges(key, img, settle);
        }
      };
      img.onerror = () => {
        failedAssetKeys.push(key);
        if (!PLACEHOLDER_MODE) {
          // the real asset is missing/renamed in the repo — fall back to the
          // hand-drawn placeholder so the sprite doesn't just vanish
          img.onerror = settle; // guard against a loop if even that somehow fails
          img.removeAttribute("crossorigin");
          img.src = renderPlaceholder(key);
        } else {
          settle();
        }
      };
      img.src = PLACEHOLDER_MODE ? renderPlaceholder(key) : ASSET_SOURCES[key];
      images[key] = img;
    });
  }

  function showAssetLoadWarning(keys) {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;bottom:8px;left:8px;right:8px;z-index:9999;" +
      "background:rgba(120,20,20,0.94);color:#fff;font:11px/1.4 monospace;" +
      "padding:10px;border-radius:8px;max-height:38vh;overflow:auto;" +
      "box-shadow:0 2px 10px rgba(0,0,0,0.5);";
    el.textContent = "Missing " + keys.length + " asset file(s) — re-upload these to the repo: " + keys.join(", ");
    document.body.appendChild(el);
  }

  // ---------- Canvas setup ----------
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // Offscreen canvas used to composite a "white flash" that's clipped to a
  // sprite's own opaque pixels (not a plain rectangle) — used for hit feedback.
  const flashCanvas = document.createElement("canvas");
  const flashCtx = flashCanvas.getContext("2d");

  function drawSpriteFlash(img, x, y, w, h, alpha) {
    const cw = Math.max(1, Math.ceil(w));
    const ch = Math.max(1, Math.ceil(h));
    flashCanvas.width = cw;
    flashCanvas.height = ch;
    flashCtx.clearRect(0, 0, cw, ch);
    flashCtx.drawImage(img, 0, 0, cw, ch);
    flashCtx.globalCompositeOperation = "source-atop";
    flashCtx.fillStyle = "#ffffff";
    flashCtx.fillRect(0, 0, cw, ch);
    flashCtx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(flashCanvas, x, y, w, h);
    ctx.restore();
  }
  // ---------- Motion blur helper — trailing copies for fast-moving sprites ----------
  function drawMotionBlur(img, x, y, w, h, rotation, speedX, speedY) {
    const totalSpeed = Math.sqrt((speedX || 0) * (speedX || 0) + (speedY || 0) * (speedY || 0));
    if (totalSpeed < 60) return;
    const blurCount = Math.min(4, Math.floor(totalSpeed / 100));
    const alphaBase = 0.12;
    for (let i = 1; i <= blurCount; i++) {
      const t = i / (blurCount + 1);
      const offsetX = (speedX || 0) * t * 0.012;
      const offsetY = (speedY || 0) * t * 0.012;
      ctx.save();
      ctx.globalAlpha = alphaBase * (1 - t);
      ctx.translate(x + offsetX, y + offsetY);
      if (rotation) ctx.rotate(rotation);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let W = 0, H = 0; // CSS pixel dimensions

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  resize();

