function seededShuffle(array, seed) {
  const arr = [...array];

  let currentIndex = arr.length;

  while (currentIndex !== 0) {
    seed = (seed * 9301 + 49297) % 233280;

    const randomIndex = Math.floor(
      (seed / 233280) * currentIndex
    );

    currentIndex--;

    [arr[currentIndex], arr[randomIndex]] = [
      arr[randomIndex],
      arr[currentIndex],
    ];
  }

  return arr;
}

function generateOrder(length, seed) {
  const indices = Array.from(
    { length },
    (_, i) => i
  );

  return seededShuffle(indices, seed);
}

function generateAccessCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}


function unshuffleIndex(selectedShuffledIndex, shuffleMap) {
  if (selectedShuffledIndex < 0 || selectedShuffledIndex > 3) return -1;
  return shuffleMap[selectedShuffledIndex];
}

function getShuffleMap(submissionSeed, questionIndex) {
  const seed = (submissionSeed + questionIndex) >>> 0;
  return seededShuffle([0, 1, 2, 3], seed);
}

module.exports = {
  generateOrder,
  generateAccessCode,
  unshuffleIndex,
  getShuffleMap,
};