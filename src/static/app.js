document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
            <h4>${name}</h4>
            <p>${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
            <div class="participants">
              <strong>Participants:</strong>
              <ul class="participants-list">
                <!-- participant items will be inserted here -->
              </ul>
            </div>
          `;

        activitiesList.appendChild(activityCard);

        // Populate participants list
        const participantsListEl = activityCard.querySelector('.participants-list');
        if (details.participants && details.participants.length) {
          details.participants.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'participant-item';
            li.dataset.email = p;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = p;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-participant';
            removeBtn.title = `Remove ${p}`;
            removeBtn.setAttribute('aria-label', `Remove ${p}`);
            removeBtn.innerHTML = '✕';

            removeBtn.addEventListener('click', async (e) => {
              e.preventDefault();
              // Call DELETE endpoint to unregister participant
              try {
                const res = await fetch(`/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(p)}`, { method: 'DELETE' });
                const result = await res.json();
                if (res.ok) {
                  // Remove li from DOM
                  li.remove();
                  // Update spots left
                  const spotsEl = activityCard.querySelector('.spots-left');
                  if (spotsEl) {
                    const current = parseInt(spotsEl.textContent, 10);
                    spotsEl.textContent = String(current + 1);
                  }
                  // If no participants remain, show placeholder
                  const remaining = participantsListEl.querySelectorAll('.participant-item');
                  if (!remaining.length) {
                    const emptyLi = document.createElement('li');
                    emptyLi.textContent = 'No participants yet';
                    emptyLi.className = 'empty';
                    participantsListEl.appendChild(emptyLi);
                  }
                  messageDiv.textContent = result.message || 'Participant removed';
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 3000);
                } else {
                  messageDiv.textContent = result.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
              } catch (err) {
                console.error('Error removing participant:', err);
                messageDiv.textContent = 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            });

            li.appendChild(nameSpan);
            li.appendChild(removeBtn);
            participantsListEl.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = 'No participants yet';
          li.className = 'empty';
          participantsListEl.appendChild(li);
        }

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
        // Update UI: add participant to activity card and decrement spots
        try {
          // Find the activity card for this activity
          const cards = activitiesList.querySelectorAll('.activity-card');
          let targetCard = null;
          cards.forEach((c) => {
            const h4 = c.querySelector('h4');
            if (h4 && h4.textContent === activity) targetCard = c;
          });

          if (targetCard) {
            const participantsListEl = targetCard.querySelector('.participants-list');
            // Remove 'No participants yet' placeholder if present
            const empty = participantsListEl.querySelector('.empty');
            if (empty) empty.remove();

            // Create new participant li with remove button
            const li = document.createElement('li');
            li.className = 'participant-item';
            li.dataset.email = email;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = email;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-participant';
            removeBtn.title = `Remove ${email}`;
            removeBtn.setAttribute('aria-label', `Remove ${email}`);
            removeBtn.innerHTML = '✕';

            removeBtn.addEventListener('click', async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                const r = await res.json();
                if (res.ok) {
                  li.remove();
                  const spotsEl = targetCard.querySelector('.spots-left');
                  if (spotsEl) {
                    const current = parseInt(spotsEl.textContent, 10);
                    spotsEl.textContent = String(current + 1);
                  }
                } else {
                  messageDiv.textContent = r.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
              } catch (err) {
                console.error('Error removing participant:', err);
              }
            });

            li.appendChild(nameSpan);
            li.appendChild(removeBtn);
            participantsListEl.appendChild(li);

            // Decrement spots left
            const spotsEl = targetCard.querySelector('.spots-left');
            if (spotsEl) {
              const current = parseInt(spotsEl.textContent, 10);
              spotsEl.textContent = String(Math.max(0, current - 1));
            }
          }
        } catch (err) {
          console.error('Error updating UI after signup:', err);
        }
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
