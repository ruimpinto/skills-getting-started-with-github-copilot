document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(activitySelect.options[0]);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        details.participants.forEach((participant) => {
          const participantItem = document.createElement("li");
          participantItem.className = "participant-item";

          const participantEmail = document.createElement("span");
          participantEmail.textContent = participant;
          participantItem.appendChild(participantEmail);

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "participant-remove";
          removeButton.setAttribute("aria-label", `Unregister ${participant} from ${name}`);
          removeButton.title = "Unregister participant";
          removeButton.innerHTML = `
            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 4.5h11M6 4.5V2.75h4V4.5m2.5 0-.65 9h-7.7l-.65-9M6.5 7v4m3-4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          `;
          removeButton.addEventListener("click", async () => {
            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(participant)}`,
                { method: "DELETE" }
              );
              const result = await response.json();

              messageDiv.textContent = response.ok ? result.message : result.detail || "An error occurred";
              messageDiv.className = response.ok ? "success" : "error";
              messageDiv.classList.remove("hidden");

              if (response.ok) {
                await fetchActivities();
              }
            } catch (error) {
              messageDiv.textContent = "Failed to unregister participant. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
              console.error("Error unregistering participant:", error);
            }
          });
          participantItem.appendChild(removeButton);
          participantsList.appendChild(participantItem);
        });
        participantsSection.appendChild(participantsList);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
