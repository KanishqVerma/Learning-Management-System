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

window.addEventListener("scroll", function () {
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

// FAQ Search Functionality
document.getElementById("faqSearch").addEventListener("keyup", function () {
  const searchValue = this.value.toLowerCase();
  const items = document.querySelectorAll(".accordion-item");

  items.forEach((item) => {
    const question = item
      .querySelector(".accordion-button")
      .textContent.toLowerCase();
    if (question.includes(searchValue)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
});

// Sidebar toggle for mobile
      document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-btn");
  const sidebar = document.getElementById("sidebar"); // ✅ note: using ID
  const main = document.querySelector(".main-wrapper");

  if (toggleBtn && sidebar && main) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      main.classList.toggle("shifted");
    });
  } else {
    console.warn("Sidebar toggle not initialized — element(s) missing");
  }
});
