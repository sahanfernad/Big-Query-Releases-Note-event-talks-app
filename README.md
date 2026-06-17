# BigQuery Release Notes Tracker & Tweet Builder

A beautiful, responsive web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that aggregates, filters, and displays official BigQuery release notes. It parses the Google Cloud feed, groups updates by date, segments them by category, and provides an interactive panel to build and publish posts directly to X (formerly Twitter).

---

## 🌟 Key Features

- 📡 **Live Feed Fetching**: Fetches from the official Google Cloud feeds ([docs.cloud.google.com/feeds/bigquery-release-notes.xml](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)) on-demand or automatically with a 5-minute cached backup to prevent server rate limiting.
- 🧩 **Granular Update Parsing**: The backend custom-parses HTML descriptions inside Atom entries, segmenting them by categories like `Feature`, `Announcement`, `Issue`, and `Deprecation` to display discrete cards instead of bulky lumped blocks.
- 🎨 **Premium Glassmorphic Dashboard**: A clean dark-mode user interface designed using HSL gradients, custom font families (`Outfit` and `Plus Jakarta Sans`), micro-animations, and skeleton loading screens for a premium UX.
- 📊 **Dynamic Stats panel**: Summary metrics tracking total updates, new features, announcements, and issues. Clicking a stat card dynamically filters the feed.
- 🔍 **Real-time Search & Filter**: Search updates by text content or filter by categories via responsive chips.
- 🐦 **Interactive Tweet Builder**:
  - **Single Tweet**: Select a specific card to generate an update summary with documentation links and standard hashtags.
  - **Aggregated Tweet**: Select multiple updates to automatically compile a bulleted list update.
  - **Character Constraint Validation**: Validates Twitter/X's 280-character limit dynamically and warns the user if their draft overflows.
  - **Publish Web Intent**: Clicking "Post to X" opens a pre-composed tweet window securely in a new browser tab.
  - **Copy to Clipboard**: Quick copying of the tweet body with a custom-styled visual toast.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, Requests, BeautifulSoup4
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Grid/Flex layouts, animations), Vanilla JavaScript (ES6)

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have Python 3.8+ installed on your system.

### 2. Clone/Locate the Project
Navigate to the project directory:
```bash
cd bq-releases-notes
```

### 3. Install Dependencies
Install the required packages from the `requirements.txt` file:
```bash
pip install -r requirements.txt
```

### 4. Start the Application
Run the Flask server:
```bash
python app.py
```
By default, the server will start in debug mode on **port 5000**.

### 5. Access the Web App
Open your web browser and navigate to:
[http://127.0.0.1:5000/](http://127.0.0.1:5000/)

---

## 📁 File Structure

```
bq-releases-notes/
├── app.py                  # Flask Application & XML feed parser
├── requirements.txt        # Python dependency list
├── README.md               # Documentation
├── static/
│   ├── css/
│   │   └── styles.css      # Custom glassmorphic styling, animations, responsive design
│   └── js/
│       └── app.js          # Client-side reactivity, search, stats, & tweet builder logic
└── templates/
    └── index.html          # Main HTML structure using inline SVG icons
```
