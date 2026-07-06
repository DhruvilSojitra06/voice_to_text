document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const transcriptArea = document.getElementById('transcriptArea');
    const languageSelect = document.getElementById('languageSelect');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const statusText = document.getElementById('statusText');

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isRecording = false;

    if (!SpeechRecognition) {
        showToast('Speech Recognition API is not supported in this browser.', 'error');
        startBtn.disabled = true;
        statusText.innerText = "Unsupported Browser";
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageSelect.value;

    // Handle Language Change
    languageSelect.addEventListener('change', () => {
        recognition.lang = languageSelect.value;
        if (isRecording) {
            recognition.stop();
            setTimeout(() => recognition.start(), 300); // Restart with new language
        }
    });

    // A better approach for continuous appending:
    let confirmedText = '';

    recognition.onstart = () => {
        isRecording = true;
        recordingIndicator.classList.add('active');
        statusText.innerText = 'Recording...';
        startBtn.disabled = true;
        stopBtn.disabled = false;

        // Save what's already in the box
        confirmedText = transcriptArea.value;
        if (confirmedText.length > 0 && !confirmedText.endsWith(' ')) {
            confirmedText += ' ';
        }
        console.log("Speech recognition started.");
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalSegment = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalSegment += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        console.log("Interim:", interimTranscript, "Final:", finalSegment);

        if (finalSegment) {
            confirmedText += finalSegment + ' ';
        }

        transcriptArea.value = confirmedText + interimTranscript;
        transcriptArea.scrollTop = transcriptArea.scrollHeight;
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied.', 'error');
            stopRecording();
        } else if (event.error === 'no-speech') {
            console.log('No speech detected by the microphone.');
        } else if (event.error === 'network') {
            showToast('Network error! Speech API requires internet.', 'error');
            stopRecording();
        } else {
            showToast(`Speech error: ${event.error}`, 'error');
        }
    };

    recognition.onend = () => {
        console.log("Speech recognition ended.");
        // If it stopped unintentionally (e.g. silence timeout), we can restart if isRecording is still true
        if (isRecording) {
            try {
                console.log("Auto-restarting due to continuous recording...");
                recognition.start();
            } catch (e) {
                console.error("Restart error", e);
            }
        } else {
            recordingIndicator.classList.remove('active');
            statusText.innerText = 'Ready to record';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };

    const stopRecording = () => {
        if (!isRecording) return;
        isRecording = false;
        recognition.stop();
    };

    // Button Listeners
    startBtn.addEventListener('click', () => {
        try {
            recognition.start();
        } catch (e) {
            console.error("Already started");
        }
    });

    stopBtn.addEventListener('click', stopRecording);

    clearBtn.addEventListener('click', () => {
        transcriptArea.value = '';
        confirmedText = '';
        showToast('Text cleared.', 'success');
    });

    copyBtn.addEventListener('click', async () => {
        if (!transcriptArea.value.trim()) {
            showToast('Nothing to copy.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(transcriptArea.value);
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy text.', 'error');
        }
    });

    downloadBtn.addEventListener('click', () => {
        const text = transcriptArea.value.trim();
        if (!text) {
            showToast('Nothing to download.', 'error');
            return;
        }

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NexTalk_Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Downloading transcript...', 'success');
    });

    // Toast Notification System
    const createToastContainer = () => {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    };

    const toastContainer = createToastContainer();

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };
});
