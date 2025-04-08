document.addEventListener("DOMContentLoaded", function () {
  const title = document.getElementById("modalTitle"); // Modal title
  const modalBody = document.querySelector("#exerciseModal .modal-body"); // Modal body

  // Event listener for the "View More" buttons
  document.querySelectorAll(".view-more-btn").forEach((button) => {
    button.addEventListener("click", function () {
      // Fetch data attributes from the clicked button
      const name = this.getAttribute("data-name");
      const img = this.getAttribute("data-img");
      const target = this.getAttribute("data-target");
      const equipment = this.getAttribute("data-equipment");

      // Update modal title
      title.textContent = name;

      // Update modal body with dynamic content
      modalBody.innerHTML = `
        <img src="${img}" class="card-img-top mb-3" alt="${name}" />
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Target Muscles:</strong> ${target}</p>
        <p><strong>Equipment:</strong> ${equipment}</p>
      `;
    });
  });
});
