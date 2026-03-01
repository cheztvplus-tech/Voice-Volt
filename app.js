// Voice Volt - Complete Voice Cloning Application

// State
const state = {
    apiKey: '',
    samples: [null, null, null],
    currentRecordingIndex: null,
    mediaRecorder: null,
    audioChunks: [],
    recordingStartTime: null,
    recordingTimer: null,
    voiceId: null,
    isRecording: false
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedVoiceId = localStorage.getItem('voiceVoltVoiceId');
    const savedKey = localStorage.getItem('voiceVoltApiKey');
    
    if (savedVoiceId) {
        state.voiceId = savedVoiceId;
        state.apiKey = savedKey || '';
        document.getElementById('apiKey').value = state.apiKey;
        showVoiceReady(savedVoiceId);
    }
});

// ==================== CALIBRATION ====================

function recordSample(index) {
    state.currentRecordingIndex = index;
    const texts = [
        "The quick brown fox jumps over the lazy dog.",
        "Hello, this is my voice being calibrated for cloning.",
        "I can read books, sing songs, and speak in my own cloned voice."
    ];
    
    document.getElementById('recordingText').textContent = texts[index];
    document.getElementById('recordingInterface').classList.remove('hidden');
    document.getElementById('recordingTimer').textContent = '00:00';
}

async function toggleRecording() {
    const btn = document.getElementById('recordBtn');
    const box = document.querySelector('.calibration-box');
    
    if (state.isRecording) {
        stopRecording();
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            state.mediaRecorder = new MediaRecorder(stream);
            state.audioChunks = [];
            
            state.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) state.audioChunks.push(e.data);
            };
            
            state.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
                saveSample(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            state.mediaRecorder.start();
            state.isRecording = true;
            state.recordingStartTime = Date.now();
            
            btn.textContent = '⏹️ Stop Recording';
            btn.classList.add('recording');
            box.classList.add('recording');
            
            state.recordingTimer = setInterval(updateTimer, 1000);
            
        } catch (err) {
            showStatus('calibrationStatus', 'Microphone error: ' + err.message, 'error');
        }
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('recordingTimer').textContent = `${mins}:${secs}`;
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        clearInterval(state.recordingTimer);
        
        document.getElementById('recordBtn').textContent = 'Start Recording';
        document.getElementById('recordBtn').classList.remove('recording');
        document.querySelector('.calibration-box').classList.remove('recording');
    }
}

function saveSample(audioBlob) {
    const index = state.currentRecordingIndex;
    state.samples[index] = audioBlob;
    
    const items = document.querySelectorAll('.sample-item');
    items[index].classList.add('recorded');
    items[index].querySelector('button').textContent = 'Re-record';
    
    const url = URL.createObjectURL(audioBlob);
    const audio = document.createElement('audio');
    audio.src = url;
    audio.controls = true;
    audio.style.cssText = 'width: 100%; margin-top: 10px;';
    
    const existing = items[index].querySelector('audio');
    if (existing) existing.remove();
    items[index].appendChild(audio);
    
    const recordedCount = state.samples.filter(s => s !== null).length;
    document.getElementById('calibrationProgress').style.width = `${(recordedCount / 3) * 100}%`;
    
    if (recordedCount === 3) {
        document.getElementById('createVoiceBtn').disabled = false;
        showStatus('calibrationStatus', 'All samples recorded! Click "Create My Voice Clone".', 'success');
    } else {
        showStatus('calibrationStatus', `Sample ${index + 1} recorded. Record ${3 - recordedCount} more.`, 'info');
    }
    
    document.getElementById('recordingInterface').classList.add('hidden');
}

// ==================== VOICE CLONING ====================

async function createVoiceClone() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        showStatus('calibrationStatus', 'Please enter your ElevenLabs API key', 'error');
        return;
    }
    
    state.apiKey = apiKey;
    localStorage.setItem('voiceVoltApiKey', apiKey);
    
    document.getElementById('calibrationSection').classList.add('hidden');
    document.getElementById('processingSection').classList.remove('hidden');
    updateStep(2);
    
    try {
        const voiceId = await createElevenLabsVoice();
        
        state.voiceId = voiceId;
        localStorage.setItem('voiceVoltVoiceId', voiceId);
        
        setTimeout(() => {
            document.getElementById('processingSection').classList.add('hidden');
            showVoiceReady(voiceId);
        }, 2000);
        
    } catch (err) {
        document.getElementById('processingSection').classList.add('hidden');
        document.getElementById('calibrationSection').classList.remove('hidden');
        showStatus('calibrationStatus', 'Failed: ' + err.message, 'error');
        updateStep(1);
    }
}

async function createElevenLabsVoice() {
    const formData = new FormData();
    formData.append('name', 'VoiceVolt_' + Date.now());
    
    for (let i = 0; i < state.samples.length; i++) {
        formData.append('files', state.samples[i], `sample_${i}.webm`);
    }
    
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: { 'xi-api-key': state.apiKey },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    
    const data = await response.json();
    return data.voice_id;
}

// ==================== USE VOICE ====================

function showVoiceReady(voiceId) {
    document.getElementById('useVoiceSection').classList.remove('hidden');
    document.getElementById('voiceIdDisplay').textContent = voiceId.substring(0, 8) + '...';
    updateStep(3);
}

function switchMode(mode) {
    document.querySelectorAll('.mode-tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'read') {
        document.getElementById('readMode').classList.remove('hidden');
        document.getElementById('singMode').classList.add('hidden');
    } else {
        document.getElementById('readMode').classList.add('hidden');
        document.getElementById('singMode').classList.remove('hidden');
    }
}

async function speakWithClone() {
    const text = document.getElementById('readText').value;
    if (!text || !state.voiceId) return;
    
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Generating...';
    
    try {
        const audioUrl = await generateSpeech(text);
        playAudio(audioUrl);
        showPlaybackStatus('Playing your cloned voice!', 'success');
    } catch (err) {
        showPlaybackStatus('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔊 Read with My Voice';
    }
}

async function generateSpeech(text) {
    const speed = parseFloat(document.getElementById('speed').value);
    const emotion = document.getElementById('emotion').value;
    
    const voiceSettings = {
        stability: 0.5,
        similarity_boost: 0.75,
        style: emotion === 'excited' ? 0.5 : 0
    };
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${state.voiceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': state.apiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voiceSettings
        })
    });
    
    if (!response.ok) throw new Error('Speech generation failed');
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

// ==================== SINGING ====================

async function singNote(note) {
    const noteNames = { 'C4': 'Do', 'D4': 'Re', 'E4': 'Mi', 'F4': 'Fa', 'G4': 'Sol', 'A4': 'La', 'B4': 'Si', 'C5': 'Do' };
    document.getElementById('currentNote').textContent = noteNames[note] || note;
    
    const text = document.getElementById('singText').value || 'La';
    
    try {
        const audioUrl = await generateSpeech(text);
        const pitch = getPitchMultiplier(note);
        playWithPitch(audioUrl, pitch);
    } catch (err) {
        showPlaybackStatus('Singing error: ' + err.message, 'error');
    }
}

async function singScale() {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    document.getElementById('currentNote').textContent = '🎹';
    
    for (const note of notes) {
        await singNote(note);
        await sleep(600);
    }
}

function getPitchMultiplier(note) {
    const freqs = { 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25 };
    return (freqs[note] || 440) / 440;
}

function playWithPitch(audioUrl, pitch) {
    const audio = new Audio(audioUrl);
    audio.playbackRate = pitch;
    audio.play();
}

// ==================== UTILITIES ====================

function updateStep(stepNum) {
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 < stepNum) el.classList.add('completed');
        else if (idx + 1 === stepNum) el.classList.add('active');
    });
}

function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.className = type === 'success' ? 'success-msg' : 'error-msg';
    el.textContent = message;
    el.classList.remove('hidden');
}

function showPlaybackStatus(message, type) {
    const el = document.getElementById('playbackStatus');
    el.className = type === 'success' ? 'success-msg' : 'error-msg';
    el.textContent = message;
}

function playAudio(url) {
    new Audio(url).play();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
