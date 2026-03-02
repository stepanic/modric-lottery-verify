# Kako sam dobio Modricev dres — i zasto to moze bilo tko provjeriti

## Sto se zapravo dogodilo?

Trendex, platforma za trgovanje sportskim tokenima na Solana blockchainu, organizirao je **tri nagradne igre** za vlasnike **$MODRIC** tokena. Nagrada u svakom krugu: **potpisani dres Luke Modrica**.

| Krug | Datum | Pobjednicki wallet |
|------|-------|--------------------|
| 1. krug | 19. listopada 2025. | `3w3kDY...XDUY` |
| 2. krug | 1. studenoga 2025. | `6hrBv4...TAeZ` |
| **3. krug** | **14. sijecnja 2026.** | **`6bwzpk...gCyA`** (moj wallet) |

Sva tri kruga koristila su **identican proces**: slucajni broj generiran na blockchainu, javno objavljen algoritam, i transparentna lista vlasnika tokena. Nitko — ni Trendex, ni pobjednici, ni bilo tko drugi — nije mogao utjecati na rezultat.

Ovaj dokument objasnjava, korak po korak, **tocno sto se dogodilo** u sva tri kruga i zasto svatko moze samostalno provjeriti da su sva tri izvlacenja bila postena.

---

## Prije svega: sto je blockchain i zasto je bitan?

Blockchain je javna, trajna knjiga zapisa. Zamislite ga kao biljeznicki ured koji je otvoren 24 sata dnevno, u kojem su svi dokumenti javni i **ne mogu se naknadno mijenjati**.

Kada se nesto zapise na blockchain:
- **Svi mogu vidjeti** taj zapis
- **Nitko ga ne moze izbrisati** ili promijeniti
- Svaki zapis ima **tocno vrijeme** kada se dogodio
- Nije potrebno nikome vjerovati — podaci su tu, javno, zauvijek

Solana je jedan od najvecih blockchainova na svijetu. Na njemu se dnevno odvija vise od 50 milijuna transakcija.

---

## Kako izvlacenje radi — u 5 koraka

Svaki od tri kruga pratio je identican postupak. Prije nego zaronimo u konkretne podatke, evo kako proces funkcionira opcenito:

### Korak 1 — Snimka stanja vlasnika tokena

Trendex napravi snimku (*snapshot*) svih vlasnika $MODRIC tokena u odredenom trenutku. Ta snimka biljeszi **tko posjeduje koliko tokena**. Objavljuje se javno na GitHubu.

### Korak 2 — Generiranje slucajnog broja na blockchainu

Trendex salje zahtjev na **Orao VRF** — nezavisni kriptografski sustav na Solana blockchainu. VRF znaci *Verifiable Random Function* (provjerljiva slucajna funkcija).

Zamislite da imate kocku koju bacate pred kamerom. Svi mogu vidjeti da kocka nije namjestena i da je rezultat stvarno slucajan. VRF radi istu stvar, ali na blockchainu — generira slucajni broj koji:

1. **Nitko ne moze predvidjeti** unaprijed (ni Trendex, ni Orao, ni bilo tko)
2. **Nitko ne moze promijeniti** nakon generiranja
3. **Svatko moze provjeriti** da je broj stvarno slucajan
4. **Zauvijek je zapisan** na blockchainu

### Korak 3 — Slucajni broj se pohranjuje na blockchain

Rezultat se trajno pohranjuje na posebnu adresu (**PDA** — *Program Derived Address*) na Solana blockchainu. Ova adresa se ne odreduje rucno — ona se **matematicki izracunava** iz pocetnog sjemena (*seed*). To znaci da je nemoguce podmetnuti lazni racun. Svatko moze izracunati adresu i provjeriti da podaci odgovaraju.

### Korak 4 — Algoritam rasporeduje slotove

Svaki vlasnik tokena dobiva broj "listica u bubnju" (slotova) proporcionalan kolicini tokena:

```
broj_slotova = floor(kolicina_tokena / 1000)
```

Tko ima 5.000 tokena — dobiva 5 listica. Tko ima 1.000.000 tokena — dobiva 1.000 listica. Tko ima manje od 1.000 tokena — ne sudjeluje.

### Korak 5 — Slucajni broj odabire pobjednika

Algoritam uzima prvih 8 bajtova slucajnog broja, pretvara ih u veliki broj, i racuna ostatak dijeljenja s ukupnim brojem slotova:

```
pobjednicki_slot = slucajni_broj mod ukupni_broj_slotova
```

Vlasnik tog slota je pobjednik. Algoritam je **deterministicki** — s istim ulaznim podacima uvijek daje isti rezultat.

---

## Trendex objavljuje pravila (listopad 2025.)

Prije prvog izvlacenja, Trendex je objavio otvoreni izvorni kod svog sustava na GitHubu:

**https://github.com/trendexgg/trendexgg**

Ovaj kod je javan. Svatko ga moze procitati, pregledati i provjeriti. Pravila igre bila su poznata **prije** svih izvlacenja — nisu se mogla naknadno mijenjati.

Izvorni kod sadrzi:
- Algoritam za odabir pobjednika ([`selection.ts`](https://github.com/trendexgg/trendexgg/blob/main/src/core/selection.ts))
- Funkciju za generiranje slotova ([`utils.ts`](https://github.com/trendexgg/trendexgg/blob/main/src/utils/utils.ts))
- Konfiguraciju (`1000 tokena = 1 slot`, [`constants.ts`](https://github.com/trendexgg/trendexgg/blob/main/src/config/constants.ts))

### Kronologija commitova na Trendexovom repozitoriju

| Datum | Commit | Sto se dogodilo |
|-------|--------|-----------------|
| 21. 10. 2025. | `5c5ded6` | Inicijalni projekt: algoritam + snapshot za 1. krug |
| 21. 10. 2025. | `bf54572` | Refaktor: validacija, modularnost |
| 1. 11. 2025. | `f028cea` | Dodan snapshot za 2. krug |
| 14. 1. 2026. | `e39e2aa` | Konfiguracija za 3. krug |
| 19. 1. 2026. | `dd66bc1` | Dodan snapshot za 3. krug (997 vlasnika) |

---

## 1. krug — 19. listopada 2025.

### Snapshot

Trendex je napravio snimku stanja **20 vlasnika** $MODRIC tokena.

| Podatak | Vrijednost |
|---------|------------|
| Datum snimke | 19. listopada 2025. |
| Vlasnika u snimci | 20 |
| Koristeno za izvlacenje | 20 (svi) |
| Ukupno slotova | 62.701 |
| Snapshot datoteka | [`modric_top_holders_oct_19.json`](https://github.com/trendexgg/trendexgg/blob/main/data/modric_top_holders_oct_19.json) |

### VRF slucajni broj

| Podatak | Vrijednost |
|---------|------------|
| VRF Seed | `2ZhsqrcNEbtHikLBQoK2mrTgJLjFSz4njPpUY9rJhpNn` |
| PDA adresa | [`FmFz1Q9reotBSa1wEUciim6Q5e6JR3AYc5eU8YUG4Fyh`](https://solscan.io/account/FmFz1Q9reotBSa1wEUciim6Q5e6JR3AYc5eU8YUG4Fyh) |
| VRF transakcija | [`4xehnSm7...FtJ8`](https://solscan.io/tx/4xehnSm7tqhSp47mHSGLJnz9o7LfRLN3xu2RjiqnHU88a68RzjnJeNfX9jzVXiECJ7tJM8NPdpLGiLTfRngcFtJ8) |
| Blok slot | 374.812.552 |
| Tocno vrijeme | 21. listopada 2025., 10:03:18 UTC |
| Randomness offset | bajtovi [40:104] |

### Izracun pobjednika

```
Bajtovi [0..8]:   0x86173c7dfc02bd62
BigUInt64:        9.662.258.037.343.305.058
Modulo:           9.662.258.037.343.305.058  mod  62.701  =  61.248
Slot 61.248  -->  pobjednik
```

### Rezultat 1. kruga

| Podatak | Vrijednost |
|---------|------------|
| Pobjednicki wallet | `3w3kDYZnyDpPZ5v6XoHtStWa5swtZehkjoY83TScXDUY` |
| Tokeni | 2.134.599 $MODRIC |
| Slotovi | 2.134 od 62.701 |
| Vjerojatnost pobjede | **3,4035%** |

---

## 2. krug — 1. studenoga 2025.

### Snapshot

Trendex je napravio snimku stanja **8 vlasnika** $MODRIC tokena.

| Podatak | Vrijednost |
|---------|------------|
| Datum snimke | 1. studenoga 2025. |
| Vlasnika u snimci | 8 |
| Koristeno za izvlacenje | 8 (svi) |
| Ukupno slotova | 36.650 |
| Snapshot datoteka | [`modric_top_holders_nov_01.json`](https://github.com/trendexgg/trendexgg/blob/main/data/modric_top_holders_nov_01.json) |

### VRF slucajni broj

| Podatak | Vrijednost |
|---------|------------|
| VRF Seed | `4SLs5v8A72kEKjwBJQoMGV3rY9xcirHQLmJ6rx6uHnez` |
| PDA adresa | [`A7WTnsag9rETHdkq44GQ9t1zwxCxa3YPomykM8sTvMVY`](https://solscan.io/account/A7WTnsag9rETHdkq44GQ9t1zwxCxa3YPomykM8sTvMVY) |
| VRF transakcija | [`3ggGrf5p...FLMJ`](https://solscan.io/tx/3ggGrf5pdAdzsNDGC9sC7mjLjUT8ievzp9F5AR9tiBGymNrA7hHcYiHkxPNXHoYmvu7wpZHSj7JG3NidrxMWFLMJ) |
| Randomness offset | bajtovi [73:137] |

### Izracun pobjednika

```
Bajtovi [0..8]:   0x77b19a77d07b7c34
BigUInt64:        8.624.844.600.780.749.876
Modulo:           8.624.844.600.780.749.876  mod  36.650  =  30.126
Slot 30.126  -->  pobjednik
```

### Rezultat 2. kruga

| Podatak | Vrijednost |
|---------|------------|
| Pobjednicki wallet | `6hrBv4pcTPf1L7VQVSvyzm9XaW7hGBuz8rrozykiTAeZ` |
| Tokeni | 7.068.308 $MODRIC |
| Slotovi | 7.068 od 36.650 |
| Vjerojatnost pobjede | **19,2851%** |

---

## 3. krug — 14. sijecnja 2026. (moj dres)

### Snapshot

Trendex je napravio snimku stanja 997 vlasnika $MODRIC tokena. Za izvlacenje je koristeno **140 najvecih vlasnika**.

| Podatak | Vrijednost |
|---------|------------|
| Datum snimke | 14. sijecnja 2026. |
| Vlasnika u datoteci | 997 |
| Koristeno za izvlacenje | 140 (top 140) |
| Ukupno slotova | 104.105 |
| Snapshot datoteka | [`modric_top_holders_jan_14_2026.json`](https://github.com/trendexgg/trendexgg/blob/main/data/modric_top_holders_jan_14_2026.json) |
| Git commit | `dd66bc1` (autor: Gabriel Gaggini, Trendex) |

### VRF slucajni broj

| Podatak | Vrijednost |
|---------|------------|
| VRF Seed | `5DkZHCp9gbBKzcto6ezFhdFqyiqhig7cfn87Ugix36kK` |
| PDA adresa | [`HJyvitPbQ7AjxaH9EPHtZjsh9e4wcuaPbgJ9YQ1Q37PF`](https://solscan.io/account/HJyvitPbQ7AjxaH9EPHtZjsh9e4wcuaPbgJ9YQ1Q37PF) |
| VRF transakcija | [`3uVX8xSc...997h`](https://solscan.io/tx/3uVX8xScufRqtpaabM2bqr5UQYQ7gKB49Js3k4APpTA3CNbxmf8K5DSzqSyzXvcTzVdST6WnLatYA5N7iNFj997h) |
| Blok slot | 393.429.835 |
| Tocno vrijeme | 14. sijecnja 2026., 10:59:03 UTC |
| Randomness offset | bajtovi [40:104] |

### Izracun pobjednika

```
Bajtovi [0..8]:   0x863eb2f78a2cfa6a
BigUInt64:        9.673.365.825.883.273.834
Modulo:           9.673.365.825.883.273.834  mod  104.105  =  74.049
Slot 74.049  -->  pobjednik
```

Zamislite bubanj sa 104.105 listica. Svaki vlasnik tokena ima broj listica proporcionalan kolicini tokena. Najveci vlasnik ima 10.057 listica, ja imam 1.430 listica, najmanji vlasnik ima 1 listic. VRF je "izvukao" listic broj 74.049 — a to je moj.

### Rezultat 3. kruga

| Podatak | Vrijednost |
|---------|------------|
| Pobjednicki wallet | `6bwzpkSKSXbjVMBYMSdazEytkaCZatibRdmExpjSgCyA` |
| Solscan | https://solscan.io/account/6bwzpkSKSXbjVMBYMSdazEytkaCZatibRdmExpjSgCyA |
| Tokeni u trenutku izvlacenja | 1.430.254 $MODRIC |
| Slotovi u bubnju | 1.430 od 104.105 |
| Vjerojatnost pobjede | **1,3736%** |
| Izvuceni slot | 74.049 |

---

## Usporedba sva tri kruga

| | 1. krug | 2. krug | 3. krug |
|--|---------|---------|---------|
| **Datum** | 19. 10. 2025. | 1. 11. 2025. | 14. 1. 2026. |
| **Vlasnika** | 20 | 8 | 140 (top) |
| **Slotova** | 62.701 | 36.650 | 104.105 |
| **Pobjednik** | `3w3kDY...XDUY` | `6hrBv4...TAeZ` | `6bwzpk...gCyA` |
| **Pobjednikovi slotovi** | 2.134 | 7.068 | 1.430 |
| **Vjerojatnost** | 3,40% | 19,29% | 1,37% |
| **VRF Seed** | `2Zhsqr...hpNn` | `4SLs5v...Hnez` | `5DkZHC...6kK` |
| **Randomness offset** | [40:104] | [73:137] | [40:104] |
| **Isti algoritam?** | Da | Da | Da |
| **Isti VRF program?** | Da (Orao) | Da (Orao) | Da (Orao) |
| **Provjerljivo on-chain?** | Da | Da | Da |

Svaki krug koristi **identicni algoritam**, **identicni VRF sustav** i **istu formulu** za raspodjelu slotova. Jedino sto se razlikuje su ulazni podaci: lista vlasnika tokena i slucajni broj s blockchaina.

Isti princip transparentnosti koji dokazuje da sam ja legitimno dobio dres u 3. krugu, jednako dokazuje da su pobjednici 1. i 2. kruga legitimno dobili svoje dresove.

---

## Zasto je ovo nemoguce namjestiti?

Evo 5 razloga zasto nitko — ni Trendex, ni pobjednici, ni bilo tko drugi — nije mogao utjecati na rezultat **ni u jednom od tri kruga**:

### 1. Slucajni broj je generiran na blockchainu, ne na Trendexovom serveru

Trendex **ne generira** slucajni broj. To radi **Orao VRF**, nezavisni kriptografski servis na Solana blockchainu. Orao VRF koristi naprednu matematiku (elipticne krivulje) koja jamci da je broj zaista slucajan i da ga nitko ne moze predvidjeti.

Da je Trendex htio varati, morao bi hakirati sam Orao VRF sustav — sto je jednako nemoguce kao razbiti enkripciju koju koriste banke.

Sva tri kruga koristila su isti Orao VRF program: `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y`

### 2. Algoritam je objavljen PRIJE izvlacenja

Izvorni kod algoritma je na GitHubu od listopada 2025. — **prije svih izvlacenja**. To znaci da su pravila bila poznata unaprijed i nisu se mogla naknadno mijenjati.

Git sustav za kontrolu verzija biljeszi svaku promjenu s tocnim vremenom. Svaka naknadna izmjena bila bi vidljiva svima.

### 3. Rezultat je deterministicki — uvijek isti

Ako uzmete isti slucajni broj i istu listu vlasnika tokena, algoritam ce **uvijek** dati istog pobjednika. Nema nikakve mogucnosti za manipulaciju.

To vrijedi za sva tri kruga. Mozete pokrenuti verifikaciju za bilo koji krug i uvijek cete dobiti istog pobjednika.

### 4. Sve je trajno zapisano na blockchainu

Svih 6 zapisa (3 transakcije + 3 PDA racuna) trajno su na Solana blockchainu. Ne mogu se izbrisati, promijeniti niti sakriti.

Za 5 godina, za 10 godina, za 50 godina — ovi podaci ce i dalje biti tu, i bilo tko ce moci ponoviti verifikaciju za svaki od tri kruga.

### 5. Svatko moze samostalno provjeriti

Ne morate vjerovati ni meni ni Trendexu. Mozete sami pokrenuti verifikaciju:

```bash
git clone https://github.com/user/modric-lottery-verify.git
cd modric-lottery-verify
npm install

# Provjeri sva tri kruga odjednom
node verify.mjs

# Ili provjeri samo odredeni krug
node verify.mjs 1    # 1. krug
node verify.mjs 2    # 2. krug
node verify.mjs 3    # 3. krug (moj dres)
```

Ili mozete rucno otvoriti svaki VRF racun na Solscanu i vidjeti da podaci postoje na blockchainu:

- **1. krug:** [VRF transakcija](https://solscan.io/tx/4xehnSm7tqhSp47mHSGLJnz9o7LfRLN3xu2RjiqnHU88a68RzjnJeNfX9jzVXiECJ7tJM8NPdpLGiLTfRngcFtJ8) · [VRF racun](https://solscan.io/account/FmFz1Q9reotBSa1wEUciim6Q5e6JR3AYc5eU8YUG4Fyh)
- **2. krug:** [VRF transakcija](https://solscan.io/tx/3ggGrf5pdAdzsNDGC9sC7mjLjUT8ievzp9F5AR9tiBGymNrA7hHcYiHkxPNXHoYmvu7wpZHSj7JG3NidrxMWFLMJ) · [VRF racun](https://solscan.io/account/A7WTnsag9rETHdkq44GQ9t1zwxCxa3YPomykM8sTvMVY)
- **3. krug:** [VRF transakcija](https://solscan.io/tx/3uVX8xScufRqtpaabM2bqr5UQYQ7gKB49Js3k4APpTA3CNbxmf8K5DSzqSyzXvcTzVdST6WnLatYA5N7iNFj997h) · [VRF racun](https://solscan.io/account/HJyvitPbQ7AjxaH9EPHtZjsh9e4wcuaPbgJ9YQ1Q37PF)

---

## Lanac povjerenja — sto je na blockchainu, a sto nije

Vazno je biti potpuno transparentan o tome sto se moze provjeriti na blockchainu, a sto zahtijeva povjerenje u Trendex.

### Na blockchainu (ne zahtijeva povjerenje u nikoga)

| Sto | Kako provjeriti | Vrijedi za |
|-----|-----------------|------------|
| VRF slucajni broj postoji | Procitati PDA racun na Solani | Sva 3 kruga |
| Transakcija je uspjesna | Pogledati na Solscanu | Sva 3 kruga |
| Orao VRF program je koristen | Vidljivo u transakciji | Sva 3 kruga |
| PDA adresa je tocno izvedena | Izracunati iz seed-a formulom | Sva 3 kruga |
| Algoritam daje istog pobjednika | Pokrenuti ga s istim podacima | Sva 3 kruga |
| $MODRIC token postoji | Provjeriti mint adresu | Jednom |
| Pobjednicki wallet drzi tokene | Provjeriti stanje na blockchainu | 3. krug |

### Objavljeno na GitHubu (transparentno, ali nije on-chain)

| Sto | Napomena |
|-----|----------|
| Snapshoti vlasnika tokena | Trendex ih je objavio na GitHubu s git commit hashovima. Git hash jamci da se datoteke ne mogu naknadno izmijeniti bez da promjena bude vidljiva. Za potpunu neovisnost, stanja tokena mogla bi se provjeriti koristeci arhivski Solana RPC na tocnom bloku svakog izvlacenja. |

---

## $MODRIC token — on-chain podaci

Cijeli sustav se vrti oko $MODRIC tokena na Solani. Evo on-chain cinjenica:

| Podatak | Vrijednost |
|---------|------------|
| Mint adresa | `F5qFr17LeunQk5ikRM9hseSi2bbZYXYRum8zaTegtrnd` |
| Solscan | https://solscan.io/token/F5qFr17LeunQk5ikRM9hseSi2bbZYXYRum8zaTegtrnd |
| Ukupna ponuda | ~999.961.007 MODRIC |
| Decimale | 6 |
| Moje stanje (trenutno) | 1.411.254 MODRIC |

---

## Sazetak

Trendex je u tri navrata (listopad 2025., studeni 2025., sijecanj 2026.) koristio **kriptografski slucajni broj generiran na Solana blockchainu** (Orao VRF) i **javno objavljen algoritam** da bi transparentno odabrao pobjednika nagradne igre za potpisani Modricev dres.

Svaki put je koristen **isti algoritam, isti VRF sustav, i isti princip**: slucajni broj koji nitko ne moze predvidjeti, deterministicki izracun koji uvijek daje isti rezultat, i trajni zapis na blockchainu koji svatko moze provjeriti.

U trecem krugu, 14. sijecnja 2026., moj wallet je odabran sa slotom 74.049 od 104.105 mogucih — i to moze bilo tko, bilo kada, samostalno potvrditi.

---

## Svi linkovi za samostalnu provjeru

### 1. krug (19. 10. 2025.)
| Resurs | Link |
|--------|------|
| VRF transakcija | [Solscan](https://solscan.io/tx/4xehnSm7tqhSp47mHSGLJnz9o7LfRLN3xu2RjiqnHU88a68RzjnJeNfX9jzVXiECJ7tJM8NPdpLGiLTfRngcFtJ8) |
| VRF racun (PDA) | [Solscan](https://solscan.io/account/FmFz1Q9reotBSa1wEUciim6Q5e6JR3AYc5eU8YUG4Fyh) |
| Snapshot | [GitHub](https://github.com/trendexgg/trendexgg/blob/main/data/modric_top_holders_oct_19.json) |

### 2. krug (1. 11. 2025.)
| Resurs | Link |
|--------|------|
| VRF transakcija | [Solscan](https://solscan.io/tx/3ggGrf5pdAdzsNDGC9sC7mjLjUT8ievzp9F5AR9tiBGymNrA7hHcYiHkxPNXHoYmvu7wpZHSj7JG3NidrxMWFLMJ) |
| VRF racun (PDA) | [Solscan](https://solscan.io/account/A7WTnsag9rETHdkq44GQ9t1zwxCxa3YPomykM8sTvMVY) |
| Snapshot | [GitHub](https://github.com/trendexgg/trendexgg/blob/main/data/modric_top_holders_nov_01.json) |

### 3. krug (14. 1. 2026.)
| Resurs | Link |
|--------|------|
| VRF transakcija | [Solscan](https://solscan.io/tx/3uVX8xScufRqtpaabM2bqr5UQYQ7gKB49Js3k4APpTA3CNbxmf8K5DSzqSyzXvcTzVdST6WnLatYA5N7iNFj997h) |
| VRF racun (PDA) | [Solscan](https://solscan.io/account/HJyvitPbQ7AjxaH9EPHtZjsh9e4wcuaPbgJ9YQ1Q37PF) |
| Pobjednicki wallet | [Solscan](https://solscan.io/account/6bwzpkSKSXbjVMBYMSdazEytkaCZatibRdmExpjSgCyA) |
| Snapshot | [GitHub](https://github.com/trendexgg/trendexgg/blob/main/data/modric_top_holders_jan_14_2026.json) |

### Opcenito
| Resurs | Link |
|--------|------|
| $MODRIC token | [Solscan](https://solscan.io/token/F5qFr17LeunQk5ikRM9hseSi2bbZYXYRum8zaTegtrnd) |
| Trendex izvorni kod | [GitHub](https://github.com/trendexgg/trendexgg) |
| Algoritam za odabir | [selection.ts](https://github.com/trendexgg/trendexgg/blob/main/src/core/selection.ts) |
| Verifikacijski alat | [GitHub](https://github.com/user/modric-lottery-verify) |
