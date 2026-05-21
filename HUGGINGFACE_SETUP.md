# Setup Hugging Face API (100% GRATUITA)

## Come ottenere l'API Key GRATIS:

1. **Crea un account gratuito su Hugging Face:**
   - Vai su: https://huggingface.co/join
   - Registrati con email (è gratis al 100%)

2. **Genera la tua API Key:**
   - Vai su: https://huggingface.co/settings/tokens
   - Clicca "New token"
   - Dai un nome (es. "Hotel Chat")
   - Seleziona "Read" come tipo
   - Clicca "Generate"
   - **Copia il token** (inizia con `hf_...`)

3. **Inserisci l'API Key nel progetto:**
   - Apri il file `.env.local` nella root del progetto
   - Sostituisci `your_huggingface_api_key_here` con il token copiato
   - Esempio: `VITE_HF_API_KEY=hf_abcdefghijklmnopqrstuvwxyz1234567890`

4. **Riavvia l'applicazione** (se era già in esecuzione)

## Note:
- ✅ **Completamente GRATUITA** - nessun costo
- ✅ Nessuna carta di credito richiesta
- ✅ Usa il modello Mistral-7B-Instruct (ottima qualità)
- ⚠️ Può essere un po' più lenta delle API a pagamento
- ⚠️ Limiti: ~1000 richieste al giorno (più che sufficiente per test)

## Il tuo System Prompt è già integrato!
L'AI risponderà seguendo le istruzioni del prompt che hai fornito per assistere lo staff dell'hotel.
