# Colyglot — Thiết kế Gameplay

> Tài liệu này mô tả **cách chơi**, không mô tả code. Mọi con số đều là _giá trị khởi điểm_ kèm
> phép thử để bác bỏ nó — người build có thể chỉnh một con số sai, nhưng không chỉnh được một con
> số không tồn tại.

---

## 1. Fantasy & Pitch

**Một câu:** _Bạn không "học tiếng Trung" — bạn nhìn thấy trí nhớ của chính mình mọc thành một khu
đất, và mỗi cái cây đứng đó là bằng chứng bạn thật sự nhớ được._

Colyglot là một trò chơi về **năng lực có thể chứng minh được** (earned mastery). Người chơi mở app
5 phút mỗi sáng, chạm trả lời vài chục từ, và khu đất lớn lên đúng bằng lượng trí nhớ thật sự bền.
Không có cách nào gian lận: câu hỏi **khó dần lên** theo độ trưởng thành của cây, nên một cái cây
cổ thụ chỉ có thể tồn tại nếu người chơi thật sự nhớ từ đó ở mức sản sinh chủ động, chứ không phải
mức đoán mò.

**Điều người chơi khoe sau 8 tuần:** không phải "tôi có 900 vàng", mà là _"nhìn cái rừng kia đi —
mỗi cái cây là một từ tôi đã nhớ vững hơn 3 tuần liền."_

**Nguyên tắc bất di bất dịch:** _hành động học **chính là** nước đi trong game._ Không có màn
"trả bài để được chơi". Câu trả lời đúng **là** cú thu hoạch.

---

## 2. Ba vòng lặp

| Vòng lặp        | Độ dài         | Câu hỏi nó trả lời                                                        |
| --------------- | -------------- | ------------------------------------------------------------------------- |
| **Khoảnh khắc** | 3–5 giây       | Một lần chạm có đã tay và đọc được ngay không?                            |
| **Phiên chơi**  | 5 phút / ngày  | Hôm nay tôi có làm xong việc gì không, và còn gì dang dở để mai quay lại? |
| **Dài hạn**     | 8 tuần trở lên | Tôi có đang giỏi lên thật, hay chỉ đang giàu lên?                         |

### Vòng lặp khoảnh khắc (3–5 giây)

```
Cây chín phát tín hiệu
   → Câu hỏi hiện lên (độ khó tuỳ tuổi cây)
   → Chạm 1 trong 4 đáp án
   → Phản hồi tức thì: đúng/sai + vàng + cây vọt lớn
   → Cây tiếp theo trượt vào
```

### Vòng lặp phiên chơi (5 phút / ngày)

```
Mở app → thấy ngay: mấy cây chín, mấy cây đang khô héo
   → Chạy "Lượt thu hoạch" (Harvest Sweep): quét hết cây chín trong MỘT mạch
   → Vàng đổ về
   → Tiêu vàng: mở thêm luống / mua đồ cho trang trại
   → Gieo từ mới vào chỗ đất vừa trống
   → Đóng app khi vẫn còn một luống đất trống chờ ngày mai
```

**Món nợ cố ý để dở:** phiên chơi luôn kết thúc lúc người chơi vừa gieo hạt mới — tức là luôn có
thứ đang lớn mà chưa được nhìn thấy kết quả. Không bao giờ để người chơi rời app ở trạng thái
"xong sạch, chẳng còn gì đang chờ".

### Vòng lặp dài hạn (tuần → tháng)

```
Từ mới → cây con → cây trưởng thành → TỐT NGHIỆP thành cây cổ thụ trong Rừng
   → luống đất được giải phóng → gieo được từ mới
   → đủ số cây cổ thụ → mở khoá Vùng đất mới (chủ đề mới: ăn uống / du lịch / công việc)
   → Vùng mới = thêm đất, thêm cảnh quan, thêm chỗ để xây dựng
```

---

## 3. Động từ cốt lõi

Mỗi động từ: người chơi **làm gì**, **tốn gì**, và **điều gì khiến nó không tự động**.

### 3.1 CHẠM TRẢ LỜI — động từ trung tâm

Đây là 90% thời gian chơi. Input luôn là **một cú chạm trong 4 lựa chọn** — không gõ phím, không
mic, chơi được trên xe buýt. Nhưng **câu hỏi khó dần lên theo tuổi cây**:

| Giai đoạn cây         | `intervalDays` trước lượt ôn | Đề bài hiện ra      | Chạm chọn trong                                               | Kỹ năng thật đang được kiểm tra |
| --------------------- | ---------------------------- | ------------------- | ------------------------------------------------------------- | ------------------------------- |
| Mầm (Seedling)        | 0–2                          | 汉字 + pinyin       | 4 nghĩa tiếng Anh                                             | Nhận diện có trợ giúp           |
| Đang lớn (Growing)    | 3–13                         | 汉字 (không pinyin) | 4 nghĩa tiếng Anh                                             | Đọc hiểu                        |
| Trưởng thành (Mature) | 14–44                        | Tiếng Anh           | 4 chữ 汉字                                                    | Sản sinh chủ động               |
| Cổ thụ (Ancient)      | 45+                          | Tiếng Anh           | 4 chữ 汉字 **gần giống nhau** (cùng bộ thủ / khác thanh điệu) | Phân biệt tinh                  |

**Vì sao đây là điểm mấu chốt:** nếu câu hỏi giữ nguyên độ khó, người chơi có thể chạm-qua 500 từ
mà vẫn á khẩu. Thang độ khó này khiến **cây to = trí nhớ thật**, không thể diễn được. Cây lớn lên
_bởi vì_ câu hỏi đã khó hơn mà người chơi vẫn thắng.

**Nhiễu (distractor) phải được chọn có chủ đích, không random:**

| Tầng         | Quy tắc chọn 3 đáp án sai                                      |
| ------------ | -------------------------------------------------------------- |
| Mầm          | Lấy từ chủ đề khác hẳn — sai thì phải thấy rõ là mình chưa học |
| Đang lớn     | Cùng chủ đề (ví dụ đều là đồ ăn)                               |
| Trưởng thành | Cùng bộ thủ **hoặc** cùng pinyin khác thanh                    |
| Cổ thụ       | Cả hai: cùng bộ thủ **và** pinyin gần giống                    |

### 3.2 CHẤM ĐIỂM TỰ ĐỘNG — bỏ hẳn tự-chấm-điểm

Người chơi **không bao giờ tự đánh giá mình nhớ tới đâu**. Hệ thống suy ra `ReviewGrade` từ
_đúng/sai_ + _thời gian phản hồi_:

| Kết quả chạm | Thời gian phản hồi                           | `ReviewGrade` | Hệ số vàng |
| ------------ | -------------------------------------------- | ------------- | ---------- |
| Sai          | bất kỳ                                       | `FORGOT` (1)  | 0.25       |
| Đúng         | > 6.0s, hoặc đổi lựa chọn giữa chừng         | `HARD` (2)    | 0.75       |
| Đúng         | 2.5s – 6.0s                                  | `GOOD` (3)    | 1.0        |
| Đúng         | 1.2s – 2.5s                                  | `EASY` (4)    | 1.25       |
| Đúng         | < 1.2s **và** cây ở tầng Trưởng thành/Cổ thụ | `PERFECT` (5) | 1.5        |

> **Giá trị khởi điểm:** các mốc 1.2s / 2.5s / 6.0s.
> **Phép thử:** ghi lại thời gian phản hồi của 200 lượt ôn thật. Nếu > 40% số lượt rơi vào cùng
> một bậc, các mốc đang vô nghĩa — dịch mốc để phân bố về khoảng 15% `EASY+PERFECT` / 55% `GOOD` /
> 20% `HARD` / 10% `FORGOT`.

**Chốt chặn chống cày vàng:** `PERFECT` **chỉ** trao ở tầng Trưởng thành trở lên. Chạm nhanh ở tầng
Mầm chỉ được `EASY`. Không thể farm hệ số 1.5 bằng từ dễ.

### 3.3 GIEO HẠT

Người chơi chọn một từ từ **Kho hạt** (seed bank) và gieo vào luống trống. Kho hạt gom theo chủ đề
của Vùng đang mở.

**Điều khiến nó không tự động:** luống đất là tài nguyên khan hiếm. Gieo 5 từ hôm nay = 5 ngày tới
ngày nào cũng phải ôn cả 5. Người chơi tự chọn tải lượng học của chính mình, và tự chịu.

### 3.4 THU HOẠCH THEO LƯỢT QUÉT (Harvest Sweep)

Khi có nhiều cây chín, người chơi **không đi bộ tới từng cây**. Một nút duy nhất chạy toàn bộ hàng
đợi: camera bay tới từng cây, hỏi, trả lời, bay tiếp — liền mạch, không ngắt quãng.

**Quy tắc bất khả xâm phạm:** _Vùng đất là để khám phá và xây dựng, KHÔNG BAO GIỜ là việc vặt._
Dù có 6 Vùng, lượt quét hằng ngày vẫn gom hết cây chín ở mọi Vùng vào **một hàng đợi duy nhất**.
Người chơi không bao giờ phải tự đi tìm xem Vùng nào còn sót cây.

Thứ tự hàng đợi dùng `orderSessionQueue`: quá hạn nặng → đến hạn → hạt mới → còn lại.

### 3.5 MỞ RỘNG & XÂY DỰNG

Tiêu vàng theo hai làn riêng biệt:

- **Làn năng lực** — mua thêm luống đất, mở Vùng mới. Quyết định: _tôi dám nhận thêm bao nhiêu từ
  mỗi ngày?_
- **Làn trang trại** — nhà, hàng rào, đường đi, cây cảnh, con vật, trang phục cho nông dân. Quyết
  định: _khu đất này trông giống ai?_

---

## 4. Vòng đời cây & tín hiệu trạng thái

Trạng thái cây **không được lưu riêng** — nó suy ra từ lịch SM-2 (`cropStage`). Một nguồn sự thật
duy nhất.

| Trạng thái | Điều kiện                   | Cây trông thế nào                          | Người chơi hiểu ngay            |
| ---------- | --------------------------- | ------------------------------------------ | ------------------------------- |
| `fresh`    | Chưa ôn lần nào             | Mầm nhỏ, đất ẩm                            | "Từ này tôi vừa gặp"            |
| `growing`  | `dueAt` còn ở tương lai     | Xanh, đứng yên, đất ẩm                     | "Không cần làm gì"              |
| `ready`    | Quá hạn, `overdueRatio` < 1 | Rung nhẹ, phát sáng viền, quả chín         | "Hái tôi đi"                    |
| `urgent`   | `overdueRatio` ≥ 1          | **Đất nứt khô, lá rũ xuống, màu nhạt dần** | "Từ này đang trôi khỏi đầu tôi" |

### Héo úa = dự báo trung thực, KHÔNG phải hình phạt

Hệ thống **không trừ** gì của người chơi khi bỏ bê. Nó không cần trừ:

> Một từ quá hạn thì **thật sự** khó nhớ hơn → người chơi **thật sự** trả lời chậm hoặc sai →
> `ReviewGrade` **thật sự** thấp → vàng **thật sự** ít đi.

Hậu quả nảy sinh từ sự thật, không từ luật lệ. Cây héo là **bản tin thời tiết của trí nhớ bạn**,
không phải cái phạt. Điều này giữ được cảm giác tử tế của một game cozy, mà vẫn có sức kéo thật.

Cường độ héo nên **tỉ lệ thuận với `overdueRatio`**, không phải bật/tắt: ratio 1.0 = hơi rũ,
ratio 3.0 = xám, đất nứt sâu. Người chơi đọc được mức độ cấp bách chỉ bằng liếc mắt.

---

## 5. Quy mô: Luống → Rừng → Vùng

Đây là lời giải cho câu hỏi "học 2000 từ thì khu đất phình to thế nào?".

### 5.1 TỐT NGHIỆP — cơ chế chống phình

Khi một từ đạt `intervalDays ≥ 21`, nó **tốt nghiệp**: rời luống đất, mọc thành **cây cổ thụ trong
Rừng** ở rìa bản đồ. Luống đất được giải phóng cho từ mới.

Cây cổ thụ **vẫn đến hạn ôn** (21–60+ ngày một lần) và vẫn trả vàng — trả **nhiều hơn hẳn**, vì
`baseHarvestGold = 2 + intervalDays`. Lượt quét hằng ngày tự gom chúng vào.

Ba thứ được giải quyết cùng lúc:

1. Số luống đất nhìn thấy luôn có giới hạn (6 → ~24 mỗi Vùng), không bao giờ ngộp.
2. **Rừng chính là phần thưởng hình ảnh, và nó được làm ra bằng trí nhớ chứ không mua bằng vàng.**
   Đúng fantasy "earned mastery": khu rừng là biểu đồ năng lực của bạn.
3. Vàng cuối game không vô nghĩa, vì cây cổ thụ trả vàng lớn nhất.

**Lễ tốt nghiệp** là khoảnh khắc cảm xúc lớn nhất trong game (xem §8).

### 5.2 GIÁNG CẤP — nguồn căng thẳng duy nhất

Nếu một cây cổ thụ bị trả lời **sai** (`FORGOT`), SM-2 kéo `intervalDays` về 1. Cây cổ thụ **đổ
xuống và quay lại làm cây con trong luống đất**.

Đây là mất mát thật, và nó hoàn toàn trung thực — bạn quên thật thì mới bị. Không có yếu tố may
rủi, không có hình phạt tuỳ tiện. Nhưng nó đủ đau để người chơi quan tâm đến khu rừng của mình.

> Nếu không còn luống trống lúc giáng cấp: cây đó vào **Nhà kính** (greenhouse) — một khu 3 ô
> riêng, chỉ dành cho từ vừa bị quên. Không bao giờ để một từ bị "kẹt ngoài" không được ôn.

### 5.3 VÙNG ĐẤT (Region)

Mỗi Vùng = một chủ đề từ vựng + một cảnh quan riêng + một cụm luống đất riêng. Người chơi **tự
chọn** mở Vùng nào tiếp theo.

| Vùng                 | Chủ đề                            | Mở khoá bằng                | Luống khởi điểm |
| -------------------- | --------------------------------- | --------------------------- | --------------- |
| Đồng Nhà (Homestead) | Nền tảng: số, chào hỏi, gia đình  | Có sẵn                      | 6               |
| Chợ (Market)         | Ăn uống, mua bán, giá cả          | 1.200 vàng + 25 cây cổ thụ  | 12              |
| Bến (Harbour)        | Du lịch, phương hướng, giao thông | 2.400 vàng + 60 cây cổ thụ  | 12              |
| Phố (Quarter)        | Công việc, học hành, xã giao      | 4.000 vàng + 120 cây cổ thụ | 12              |

**Cổng khoá kép (vàng **và** số cây cổ thụ) là cố ý.** Nếu chỉ khoá bằng vàng, người chơi cày được.
Số cây cổ thụ không cày được — nó chỉ đến khi thời gian trôi qua và trí nhớ thật sự bền. Vùng mới
là **bằng chứng**, không phải hàng hoá.

---

## 6. Kinh tế & tiến triển

### 6.1 Mục tiêu cân bằng (nêu rõ để còn kiểm chứng được)

> Đến **ngày 60**, một người chơi đều đặn 5 phút/ngày có khoảng **150–250 từ đang sống**, phải ôn
> **15–25 lượt/ngày** (≈ 2 phút), và còn **~3 phút** cho gieo hạt + xây dựng.
>
> **Phép thử:** nếu số lượt ôn/ngày vượt 35 trước ngày 60 → giảm tốc độ mở luống. Nếu dưới 8 →
> tăng số luống mỗi lần mở rộng lên 4.

### 6.2 Vàng vào

| Nguồn                | Công thức                                               | Ví dụ                             |
| -------------------- | ------------------------------------------------------- | --------------------------------- |
| Thu hoạch            | `(2 + intervalDays) × hệ số grade`, chặn trần ở 60 ngày | Cây 6 ngày + `GOOD` = 8 vàng      |
| Thu hoạch cây cổ thụ | như trên, interval lớn                                  | Cây 45 ngày + `PERFECT` = 71 vàng |
| Chuỗi ngày (streak)  | Thưởng cuối lượt quét                                   | xem 6.4                           |

Thu nhập ước tính (giá trị khởi điểm):

| Mốc      | Số từ sống | Lượt ôn/ngày | Vàng/ngày |
| -------- | ---------- | ------------ | --------- |
| Ngày 1–3 | 6–12       | 3–8          | 25–50     |
| Tuần 2   | 30–45      | 8–14         | 90–160    |
| Tuần 4   | 70–110     | 12–20        | 200–400   |
| Ngày 60  | 150–250    | 15–25        | 400–800   |

### 6.3 Vàng ra

| Hạng mục              | Giá                                            | Tác dụng lên lối chơi                   |
| --------------------- | ---------------------------------------------- | --------------------------------------- |
| Mở rộng luống (+3 ô)  | 20, 40, 60, 80… (`expandBedCost`, tăng đều 20) | Tăng số từ mới/ngày                     |
| Mở Vùng mới           | 1.200 / 2.400 / 4.000 **+ cổng cây cổ thụ**    | Chủ đề mới, cảnh quan mới, 12 luống     |
| Nhà (nâng cấp 3 bậc)  | 300 / 900 / 2.500                              | Thuần thẩm mỹ — cột mốc nhìn thấy được  |
| Hàng rào, lối đi, đèn | 60 – 400                                       | Trang trí tự do                         |
| Con vật               | 500 – 1.500                                    | Trang trí + một tác dụng nhỏ (xem dưới) |
| Trang phục nông dân   | 200 – 800                                      | Thuần thẩm mỹ                           |

**Con vật phải làm được gì đó, nếu không thì chỉ là ghi sổ.** Mỗi con vật cho **một tiện ích nhỏ,
không bao giờ là sức mạnh**:

| Con vật | Tiện ích                                                                  |
| ------- | ------------------------------------------------------------------------- |
| Gà      | Đánh dấu cây sắp chín nhất trong ngày — đi theo nó là biết ôn gì trước    |
| Mèo     | Ngủ cạnh luống có từ hay sai nhất (leech) — chỉ ra điểm yếu               |
| Chó     | Chạy ra cổng khi chuỗi ngày sắp đứt                                       |
| Bò      | Rừng đẹp hơn quanh chỗ nó đứng — thuần thẩm mỹ, và thừa nhận thẳng là vậy |

### 6.4 Chuỗi ngày (streak) — dây căng của "earned mastery"

Không có mạng, không có tim, không có hình phạt. Chỉ có một con số: **số ngày liên tiếp quét sạch
cây chín**.

| Chuỗi   | Thưởng                                    |
| ------- | ----------------------------------------- |
| 3 ngày  | +10% vàng lượt quét                       |
| 7 ngày  | +20% vàng, mở một món trang trí riêng     |
| 30 ngày | +30% vàng, đổi diện mạo bầu trời của Vùng |

Đứt chuỗi **không lấy đi gì cả** — chỉ về 0. Đây là "mất cái sắp có được", không phải "mất cái đang
có". Nhẹ nhàng hơn nhiều, mà vẫn kéo người chơi quay lại.

> **Giá trị khởi điểm:** các mốc 3/7/30.
> **Phép thử:** nếu tỉ lệ quay lại ngày-2 dưới 40%, kéo phần thưởng đầu tiên về ngày 2.

---

## 7. Thắng / Thua / Căng thẳng

**Không có màn thắng.** Đây là game duy trì, không phải game kết thúc.

**Không có màn thua.** Thay vào đó, bốn nguồn căng thẳng:

1. **Giáng cấp** (§5.2) — quên một cây cổ thụ thì nó đổ thật. Mất mát duy nhất trong game, và hoàn
   toàn do trí nhớ quyết định.
2. **Héo úa** (§4) — dự báo trực quan việc từ đang trôi đi.
3. **Khan hiếm luống đất** — gieo nhiều hôm nay = bận rộn suốt tuần sau. Tự chọn tải, tự chịu.
4. **Chuỗi ngày** — thứ duy nhất không mua lại được bằng vàng.

**Cột mốc thay cho màn thắng:** mỗi Vùng có ngưỡng "thuần thục" (80% số từ của Vùng đã thành cây
cổ thụ). Đạt ngưỡng → Vùng được trao một tấm bia + đổi diện mạo vĩnh viễn. Người chơi có thứ để
hướng tới mà không cần kết thúc gì cả.

---

## 8. Juice & Feel

Cảm giác nằm ở hàng chục mili-giây. Mọi thứ dưới đây là thứ tự và thời lượng, không phải mô tả.

### 8.1 Một lần chạm trả lời

| Mốc thời gian | Chuyện gì xảy ra                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 ms          | Nút được chạm sáng lên **ngay** — dưới 100 ms là ngưỡng người dùng cảm thấy "tức thì" (Nielsen, _Response Times: The 3 Important Limits_, 1993) |
| 0–80 ms       | Nút lún xuống 2px, haptic nhẹ                                                                                                                   |
| 120 ms        | **Đúng:** đáp án bung xanh, chuông cao. **Sai:** rung ngang 6px trong 120 ms, tông trầm — không chói, không đỏ rực                              |
| 180 ms        | Số vàng bay ra từ cây, bắt đầu bay về chỗ đếm vàng                                                                                              |
| 400 ms        | Cây vọt lớn một nấc (scale 1.0 → 1.14 → 1.0 trong 260 ms), lá bung ra                                                                           |
| 600 ms        | Số vàng chạm vào ô đếm, con số nhảy                                                                                                             |
| 900 ms        | Câu hỏi tiếp theo trượt vào                                                                                                                     |

**Khi sai, câu trả lời đúng phải nằm trên màn hình tối thiểu 1.500 ms** trước khi chuyển tiếp —
đây là khoảnh khắc học thật sự, không được nuốt mất vì animation.

> **Giá trị khởi điểm:** 900 ms giữa hai câu.
> **Phép thử:** đo thời gian trọn một lượt quét 20 cây. Nếu vượt 3 phút, rút xuống 650 ms. Nếu
> người chơi báo "bị hối", nâng lên 1.100 ms.

### 8.2 Lễ tốt nghiệp (khoảnh khắc đắt nhất của game)

Chỉ xảy ra khi một từ đạt 21 ngày. Phải khiến người chơi dừng lại:

| Mốc      | Chuyện gì xảy ra                                                    |
| -------- | ------------------------------------------------------------------- |
| 0 ms     | Lượt quét **dừng hẳn**. Mọi thứ khác tối đi.                        |
| 200 ms   | Camera kéo ra khỏi luống                                            |
| 400 ms   | Cây bật gốc nhẹ nhàng, bay về phía Rừng                             |
| 1.200 ms | Hạ xuống, mọc thành cổ thụ trong 1.200 ms, đất rung                 |
| 2.400 ms | Bảng tên hiện ra: **汉字 · pinyin · nghĩa · "đã nhớ vững 21 ngày"** |
| 3.200 ms | Bộ đếm Rừng +1, quay lại lượt quét                                  |

Không được bỏ qua ở 3 lần đầu tiên. Sau đó cho phép chạm để bỏ qua.

### 8.3 Lễ giáng cấp

Phải buồn, tuyệt đối không được sỉ nhục:

| Mốc      | Chuyện gì xảy ra                                                                |
| -------- | ------------------------------------------------------------------------------- |
| 0 ms     | Đáp án đúng hiện ra, giữ 1.500 ms                                               |
| 600 ms   | Camera quay sang cổ thụ trong Rừng                                              |
| 900 ms   | Lá rụng, cây teo lại thành cây con trong 900 ms                                 |
| 1.800 ms | Cây con đáp xuống luống trống. Chữ: _"Quay lại từ đầu — lần này sẽ nhanh hơn."_ |

### 8.4 Ba quy tắc chung

1. **Luôn hai kênh phản hồi trở lên** — hình + âm tối thiểu, có haptic thì ba.
2. **Không bao giờ khoá input.** Chạm được trong lúc animation chạy → animation nhảy tới cuối. Nếu
   phải chọn giữa "nặng tay" và "phản hồi nhanh", **luôn chọn phản hồi nhanh**.
3. **Đệm input 120 ms** — chạm sớm ngay trước khi câu hỏi kịp hiện vẫn được ghi nhận.
   _Phép thử: người chơi có bấm trúng ý định 9/10 lần không? Trượt quá 20% thì nâng thêm 30 ms._

---

## 9. Kiểm tra 5 thành phần

| Thành phần       | Tình trạng                   | Ghi chú                                                                                               |
| ---------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Response**     | **Mạnh**                     | Chạm 1 lần, phản hồi < 100 ms, không khoá input, có đệm 120 ms                                        |
| **Clarity**      | **Mạnh**                     | `cropStage` là tín hiệu duy nhất; héo úa tỉ lệ thuận với độ quá hạn; con gà chỉ ra cây tiếp theo      |
| **Satisfaction** | **Trung bình → phải làm kỹ** | Lượt ôn thường dễ thành đều đều. Lễ tốt nghiệp là thứ gánh cả game — nếu nó nhạt, toàn bộ fantasy sụp |
| **Fit**          | **Mạnh**                     | Trí nhớ bền ↔ cây lớn là một phép ẩn dụ đúng, không khiên cưỡng                                       |
| **Motivation**   | **Mạnh**                     | Mọi cú chạm đổi trạng thái vĩnh viễn: lịch SM-2, vàng, Rừng                                           |

**Điểm yếu cần xử lý:** Satisfaction ở lượt ôn thường. Ba hướng chữa, ưu tiên theo thứ tự:

1. **Biến thiên phần thưởng, đừng nhỏ giọt đều.** Cây interval cao trả vàng vọt hẳn lên — người
   chơi phải thấy con số nhảy khác thường.
2. **Nhịp lượt quét phải có nhạc tính.** 5 cây liên tiếp đúng → nhạc nền cộng thêm một lớp; chuỗi
   đứt thì lớp đó tắt.
3. **Đếm ngược tới lễ tốt nghiệp.** Cây sắp đạt 21 ngày phải _phát sáng khác_ trước một lượt ôn.
   Người chơi biết cái cây này sắp thành cổ thụ.

---

## 10. Rủi ro thiết kế & giả định

### 10.1 Chiến thuật trội (dominant strategy)

**Gieo chậm để giữ gánh nặng thấp.** Người chơi có thể cố tình để trống luống đất, giữ tải ôn ở mức
tối thiểu, mà vẫn nhận thưởng chuỗi ngày.

- _Vì sao không chặn cứng:_ đây là quyền chính đáng của người chơi bận.
- _Đối trọng:_ cổng mở Vùng khoá bằng **số cây cổ thụ**. Gieo chậm = ít cổ thụ = không mở được
  Vùng mới = nội dung đứng yên.

### 10.2 Đoạn chán

**Ngày 3–9.** Từ mới đã hết cảm giác lạ, mà chưa cây nào tốt nghiệp (sớm nhất là ngày 22 theo
SM-2: 1 → 6 → 15 → 21).

- _Chữa:_ hạ mốc tốt nghiệp đầu tiên — **cây ĐẦU TIÊN của người chơi tốt nghiệp ở 15 ngày thay vì
  21**, chỉ một lần duy nhất, để họ nhìn thấy lễ tốt nghiệp sớm hơn một tuần.
- _Chữa thêm:_ đặt phần trang trí đầu tiên mua được vào khoảng ngày 4–5.

### 10.3 Vách tuning

**Trần vàng ở 60 ngày** (`BASE_GOLD_CAP_DAYS`). Sau ngày ~120, phần lớn cây cổ thụ đều chạm trần,
vàng thành vô hạn và mọi thứ mua được hết.

- _Phép thử:_ mô phỏng 200 ngày. Nếu vàng tích luỹ vượt tổng giá mọi món trong cửa hàng ở ngày
  150 → hoặc thêm bậc trang trí đắt hơn, hoặc cho phép **đầu tư vàng vào Rừng** (biến vàng thành
  cảnh quan vĩnh viễn, tiêu bao nhiêu cũng được).

### 10.4 Giả định có nhãn

```
GIẢ ĐỊNH: nhiễu chọn có chủ đích (cùng bộ thủ / cùng pinyin khác thanh) là đủ khó
TÁC ĐỘNG: cả fantasy "earned mastery" đứng trên chỗ này — nếu 4 lựa chọn vẫn quá dễ,
          người chơi chạm-qua mà không nhớ gì, và cái Rừng là lời nói dối
NẾU SAI:  mọi con số kinh tế đều sai theo, vì grade cao sẽ bị thổi phồng
KIỂM CHỨNG: ở tầng Cổ thụ, tỉ lệ đúng phải nằm trong khoảng 75–88%. Trên 92% = nhiễu quá dễ,
          phải siết luật chọn nhiễu hoặc chuyển tầng Cổ thụ sang gõ pinyin
```

```
GIẢ ĐỊNH: người chơi chấp nhận không được tự chấm điểm
TÁC ĐỘNG: người quen Anki sẽ thấy mất kiểm soát ("tôi biết mà, tôi chỉ chạm nhầm")
NẾU SAI:  họ thấy lịch ôn sai với cảm nhận của mình và bỏ game
KIỂM CHỨNG: cho phép MỘT lần "chạm nhầm" mỗi lượt quét — hoàn tác trong 2 giây sau khi trả lời sai.
          Theo dõi tần suất dùng: nếu > 15% số lượt sai, vấn đề là ở UI chứ không ở trí nhớ
```

```
GIẢ ĐỊNH: mốc tốt nghiệp 21 ngày giữ được mật độ luống đất dễ chịu
TÁC ĐỘNG: quyết định số luống nhìn thấy và tốc độ từ-mới/ngày
NẾU SAI:  hoặc luống lúc nào cũng đầy ứ (người chơi không gieo được gì mới, thấy bế tắc),
          hoặc luống trống hoác (khu đất nhìn hoang tàn)
KIỂM CHỨNG: mô phỏng 90 ngày. Tỉ lệ luống có cây nên nằm trong 60–85% suốt quá trình
```

### 10.5 Xung đột đã giải quyết (ghi lại để sau này không làm lại sai)

| Xung đột                                           | Đã chọn                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| Nhận diện (dễ) vs. sản sinh (đúng với "mastery")   | Giữ chạm 4 lựa chọn, nhưng **đổi chiều đề bài** theo tuổi cây        |
| Vùng đất riêng biệt vs. lượt quét 5 phút           | Vùng để khám phá/xây dựng; ôn bài **luôn gom vào một hàng đợi**      |
| Trang trí (không tạo quyết định) vs. cổng năng lực | Vàng có hai làn; Vùng khoá kép bằng vàng **và** cây cổ thụ           |
| Phạt bỏ bê vs. giữ game tử tế                      | Không phạt gì cả — hậu quả tự nảy sinh từ việc trả lời chậm/sai thật |

---

## 11. Playtest — mỗi bài đều có ngưỡng đạt

| #   | Bài test                     | Cách làm                                                                    | Ngưỡng đạt                                                                                                       |
| --- | ---------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **Người mới**                | Không giải thích gì. Đưa máy, bảo "chơi đi"                                 | 8/10 người tự gieo được hạt đầu tiên và hoàn tất lượt quét đầu, không cần hỏi                                    |
| 2   | **Đọc được**                 | Xem qua vai lúc họ chơi, hỏi "vừa rồi chuyện gì xảy ra?"                    | 8/10 lần giải thích đúng vì sao cây đó lớn lên / héo đi                                                          |
| 3   | **Kỹ năng có được trả công** | So người học thật 4 tuần vs. người chạm bừa 4 tuần                          | Người học thật phải có số cây cổ thụ cao hơn rõ rệt. Nếu chạm bừa cũng ra rừng — **nhiễu quá dễ, thiết kế hỏng** |
| 4   | **Phá hoại**                 | Cố cày vàng: chỉ gieo từ siêu dễ, chạm thật nhanh, không bao giờ để cây già | Không mở nổi Vùng 2 (vì thiếu cây cổ thụ). Nếu mở được → cổng khoá hỏng                                          |
| 5   | **Áp lực**                   | Chạm liên tục, xoay máy giữa lễ tốt nghiệp, để app nền 3 ngày rồi mở lại    | Không crash, không kẹt, không mất tiến độ. 40 cây quá hạn vẫn quét gọn trong 4 phút                              |
| 6   | **Đồng hồ 5 phút**           | Bấm giờ 20 phiên chơi thật, từ ngày 1 đến ngày 60                           | Trung vị ≤ 5:30. Vượt 7 phút ở bất kỳ ngày nào → giảm tốc độ mở luống                                            |

**Thứ phải test trước tiên:** bài #3. Nếu chạm bừa cũng ra được rừng đẹp, thì cả tài liệu này vô
nghĩa — và đó là thứ rẻ nhất để kiểm chứng.

---

## 12. Phạm vi

### Có trong v1

- Thang độ khó 4 tầng, chạm 4 lựa chọn, chấm điểm tự động
- Lượt quét gom một hàng đợi (`orderSessionQueue`)
- Tốt nghiệp ở 21 ngày + giáng cấp + Nhà kính
- Vùng Đồng Nhà + Vùng Chợ
- Mở rộng luống, nhà 3 bậc, hàng rào, 2 con vật
- Chuỗi ngày 3/7/30

### Cố tình để sau v1

- **Ghép từ thành câu** (graft: hai từ cổ thụ → một cụm từ). Ý tưởng đúng fantasy nhất, nhưng cần
  nền từ vựng đủ lớn mới có nghĩa. Để sau.
- Vùng Bến, Vùng Phố
- Thăm trang trại của người khác
- Gõ pinyin làm chế độ tự chọn (thưởng thêm vàng)
- Đọc thành tiếng

### Câu hỏi còn mở cho vòng review sau

1. Ở tầng Cổ thụ, 4 lựa chọn "gần giống nhau" có đủ khó thật không, hay phải chuyển sang gõ?
   (bài test #3 trả lời)
2. Mốc tốt nghiệp 21 ngày — có nên cho người chơi tự chọn ngưỡng (kiểu "chế độ khó") không?
3. Vàng có nên **đầu tư được vào Rừng** để chống lạm phát cuối game, hay để cảnh quan rừng thuần
   tuý do trí nhớ tạo ra, không mua được đồng nào?
