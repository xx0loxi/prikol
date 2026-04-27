body {
    margin: 0;
    padding: 0;
    background: #0a0a0a;
    font-family: 'Courier New', monospace;
    color: #e0e0e0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}
.container {
    background: #1a1a1a;
    border: 1px solid #333;
    padding: 30px;
    max-width: 450px;
    width: 90%;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0,255,0,0.1);
}
h1 {
    text-align: center;
    color: #00ff88;
    margin-bottom: 20px;
}
#info-block p {
    border-bottom: 1px dashed #333;
    padding: 8px 0;
    margin: 0;
    font-size: 0.95rem;
}

@media (max-width: 480px) {
    body {
        align-items: flex-start;
        padding-top: 20px;
    }
    .container {
        padding: 15px 12px;
        width: 92%;
        max-width: 100%;
        margin: 0 auto;
    }
    h1 {
        font-size: 1.2rem;
        margin-bottom: 12px;
    }
    #info-block p {
        font-size: 0.85rem;
        padding: 6px 0;
        word-break: break-word;
    }
}
