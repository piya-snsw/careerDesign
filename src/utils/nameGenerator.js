const animals = [
  'ライオン', 'ペンギン', 'キリン', 'ゾウ', 'パンダ', 
  'ウサギ', 'キツネ', 'ネコ', 'イヌ', 'ハムスター', 
  'トラ', 'クマ', 'シカ', 'カピバラ', 'コアラ'
];

const adjectives = [
  'はしる', 'おどる', 'ねむい', 'わらう', 'うたう', 
  'あかい', 'あおい', 'しろい', 'はやい', 'つよい', 
  'やさしい', 'まるい', 'ふしぎな', 'きらきらな'
];

export const generateRandomName = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj}${animal}`;
};