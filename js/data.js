// 預設環境白噪音設定 (直接讀取你專案內的 ./assets/audio/*.mp3)
var DEFAULT_SOUNDS = [
  { 
    id: 'rain', 
    name: '窗外微雨', 
    icon: 'cloud-rain', 
    volume: 60, 
    active: false,
    url: './assets/audio/rain.mp3'
  },
  { 
    id: 'fire', 
    name: '壁爐柴火', 
    icon: 'flame', 
    volume: 50, 
    active: false,
    url: './assets/audio/fire.mp3'
  },
  { 
    id: 'cafe', 
    name: '深夜咖啡館', 
    icon: 'coffee', 
    volume: 40, 
    active: false,
    url: './assets/audio/cafe.mp3'
  },
  { 
    id: 'pages', 
    name: '翻書與書寫', 
    icon: 'book-open', 
    volume: 45, 
    active: false,
    url: './assets/audio/pages.mp3'
  }
];

// 預設今日待辦事項（預設為空，由使用者自行新增）
var DEFAULT_TODOS = [];

// 預設個人書架館藏（預設為空，由使用者自行新增）
var DEFAULT_BOOKS = [];