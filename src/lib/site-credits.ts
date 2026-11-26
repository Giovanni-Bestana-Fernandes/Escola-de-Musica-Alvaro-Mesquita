// Créditos das fotos substitutas (de public/assets/img/credits.json, gerado pelo photos.mjs fetch) e das imagens
// da landing (sala de ensaio e instrumentos recortados, de public/landing/img/credits.json, gerado por npm run images).
import landing from "../../public/landing/img/credits.json";

type Credit = { id: string; by: string; licence: string; page: string };
const LANDING: Credit[] = landing.map(({ id, by, licence, page }) => ({ id, by, licence, page }));

export const PHOTO_CREDITS: Credit[] = [
  ...LANDING,
  {
    "id": "f93045510",
    "by": "Nataev",
    "licence": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Close_up_of_an_acoustic_guitar_being_played.jpg"
  },
  {
    "id": "f175224612",
    "by": "Mostafameraji",
    "licence": "CC0",
    "page": "https://commons.wikimedia.org/wiki/File:Bass_Player.jpg"
  },
  {
    "id": "f17114225",
    "by": "zaui/Scott Catron",
    "licence": "CC BY-SA 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Piano_practice_hands.jpg"
  },
  {
    "id": "f1557609",
    "by": "Alno",
    "licence": "CC BY-SA 3.0",
    "page": "https://commons.wikimedia.org/wiki/File:Ukulele-electro-acoustic.JPG"
  },
  {
    "id": "f186065728",
    "by": "Shixart1985",
    "licence": "CC BY 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Close_up_view_of_a_microphone_set_up_in_a_recording_studio.jpg"
  },
  {
    "id": "f191180461",
    "by": "Shixart1985",
    "licence": "CC BY 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Microphone_poised_above_drums_in_a_cozy_studio_setting_undefined.jpg"
  },
  {
    "id": "f27422285",
    "by": "Lilla Frerichs",
    "licence": "CC0",
    "page": "https://commons.wikimedia.org/wiki/File:Ibanez_TCY20EVV_Talman_Acoustic-Electric_Guitar_(Vintage_Violin_finish)_close-up.jpg"
  },
  {
    "id": "f190017875",
    "by": "Shixart1985",
    "licence": "CC BY 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Live_rock_band_performance_under_stage_lights_during_an_outdoor_festival_in_the_evening.jpg"
  },
  {
    "id": "f32699013",
    "by": "Pisethinfo",
    "licence": "CC BY-SA 3.0",
    "page": "https://commons.wikimedia.org/wiki/File:Close-up_Acoustic_Guitar.jpg"
  },
  {
    "id": "f186065725",
    "by": "Shixart1985",
    "licence": "CC BY 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Drum_set_ready_for_practice_in_a_music_studio_with_microphone_and_cymbals.jpg"
  },
  {
    "id": "f196893593",
    "by": "Shixart1985",
    "licence": "CC BY 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:A_sheet_of_music_featuring_various_notes_and_chords_rests_next_to_an_electric_guitar.jpg"
  },
  {
    "id": "f189822850",
    "by": "Shixart1985",
    "licence": "CC BY 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Person_playing_guitar_at_home_while_using_laptop_for_music_inspiration_in_a_cozy_indoor_setting.jpg"
  }
];
