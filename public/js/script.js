// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

window.addEventListener("scroll", function() {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

document.addEventListener("DOMContentLoaded", () => {
    const courseSelect = document.getElementById("courseSelect");
    const newCourseInput = document.getElementById("newCourseInput");

    courseSelect.addEventListener("change", function () {
      if (this.value === "new") {
        newCourseInput.classList.remove("d-none");
        newCourseInput.required = true;
        newCourseInput.focus();
      } else {
        newCourseInput.classList.add("d-none");
        newCourseInput.required = false;
        newCourseInput.value = "";
      }
    });
  });