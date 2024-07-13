const userGuideButton = document.getElementById("user_guide");
const closeGuideButton = document.getElementById("close_guide");
const images = document.getElementById("user_guide_image");

userGuideButton.addEventListener("click", () => {
  console.log("User guide button clicked");
  images.classList.toggle("hidden");
});

closeGuideButton.addEventListener("click", () => {
  console.log("Close button clicked");
  images.classList.add("hidden");
});
