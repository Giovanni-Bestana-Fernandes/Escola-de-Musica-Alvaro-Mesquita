/**
 * Conteúdo do site. Para mudar um texto, um professor ou um curso, edite este arquivo.
 * Os textos aceitam **negrito** e *itálico*; parágrafos são separados por uma linha em branco.
 */
import { ADDRESS_DEFAULT } from "@/lib/address";
import { WHATSAPP_DEFAULT } from "@/lib/whatsapp";

export interface Settings {
  school_name: string;
  tagline: string | null;
  address: string | null;
  /** Link "Incorporar um mapa" do Google Maps (opcional). Sem ele, o mapa é montado a partir do endereço. */
  maps_embed_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
}
export interface Section {
  slug: string;
  title: string;
  body: string;
  image_url: string | null;
  visible: boolean;
}
export interface Instrument {
  id: number;
  name: string;
  /** Liga o curso à cor e à imagem do carrossel (CUT em src/app/route.ts) e aos ícones da equipe. */
  slug: string;
  description: string | null;
}
export interface Teacher {
  id: string;
  full_name: string;
  bio: string | null;
  /** "admin" = o fundador, que aparece por último na equipe. */
  role: "admin" | "teacher";
  /** Nomes dos cursos, iguais aos de INSTRUMENTS. */
  instruments: string[];
  /** Nome que aparece no cartão (ex.: Alvarinho). */
  nickname: string | null;
}

export const SETTINGS: Settings = {
  school_name: "Espaço Musical Álvaro Mesquita",
  tagline: "Formando músicos para a vida.",
  address: ADDRESS_DEFAULT,
  maps_embed_url: null,
  whatsapp: WHATSAPP_DEFAULT,
  instagram: "escolaalvaromesquita",
  email: null,
};

export const SECTIONS: Section[] = [
  {
    slug: "sobre",
    title: "Sobre a escola",
    body: "A escola nasceu das aulas de **guitarra** do professor Álvaro Mesquita e foi crescendo junto com os alunos.\n\nHoje são aulas de **guitarra, violão, baixo, teclado, ukulelê e canto**, presenciais e online.",
    image_url: null,
    visible: true,
  },
  {
    slug: "festivais",
    title: "Festivais",
    body: "Várias vezes por ano, todos os alunos sobem ao palco nos nossos **festivais**. Cada aluno toca o repertório que preparou nas aulas, sozinho ou em grupo.",
    image_url: null,
    visible: true,
  },
  {
    slug: "nova-sede",
    title: "A nova sede",
    body: "Para receber mais alunos, **mudamos de sede**.\n\nAgora contamos com mais salas, estúdio para ensaios e um espaço para os nossos festivais.",
    image_url: null,
    visible: true,
  },
  {
    slug: "projeto-bandas",
    title: "Projeto de Bandas",
    body: "O Projeto de Bandas do Espaço Musical nasceu para proporcionar aos nossos alunos a experiência de viver uma **banda de verdade**.\n\nSob a orientação do professor **Alvarinho**, os participantes se reúnem para ensaiar, desenvolver o entrosamento, aperfeiçoar a técnica, aprender a ouvir o outro e construir a música em conjunto.\n\nCada ensaio é um passo importante para ganhar confiança, presença de palco e se preparar para futuras apresentações.\n\nO projeto incentiva o trabalho em equipe, a disciplina e a vivência prática da música, preparando os alunos para apresentações e fortalecendo o seu desenvolvimento artístico.",
    image_url: null,
    visible: true,
  },
];

/** Na ordem do carrossel. */
export const INSTRUMENTS: Instrument[] = [
  { id: 2, name: "Violão", slug: "violao", description: "Popular e erudito, dedilhado, batidas e leitura de cifras e partituras." },
  { id: 1, name: "Guitarra", slug: "guitarra", description: "Do primeiro acorde aos solos: técnica, repertório e improvisação." },
  { id: 3, name: "Baixo", slug: "baixo", description: "Groove, linhas de baixo e a base rítmica de qualquer banda." },
  { id: 5, name: "Ukulelê", slug: "ukulele", description: "Leve, divertido e perfeito para começar na música." },
  { id: 6, name: "Canto", slug: "canto", description: "Técnica vocal, respiração, afinação e interpretação." },
  { id: 4, name: "Teclado", slug: "teclado", description: "Harmonia, leitura e acompanhamento para todos os estilos." },
];

const CORDAS = ["Violão", "Guitarra", "Baixo", "Ukulelê", "Canto"];

export const TEACHERS: Teacher[] = [
  { id: "lucas", full_name: "Lucas", bio: null, role: "teacher", instruments: CORDAS, nickname: null },
  { id: "camila", full_name: "Camila", bio: null, role: "teacher", instruments: ["Teclado"], nickname: null },
  {
    id: "alvaro",
    full_name: "Álvaro Mesquita",
    bio: "Fundador da escola e responsável pelo Projeto de Bandas.",
    role: "admin",
    instruments: CORDAS,
    nickname: "Alvarinho",
  },
];
