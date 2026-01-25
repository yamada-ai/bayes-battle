# 第4世代ポケモン対戦における Generative Particle Belief + Latent Action PPO
（Methodology 草案 / 日本語・論文調）

## 0. 概要と狙い
本研究は、ポケモン第4世代対戦を **部分観測マルコフ決定過程（POMDP）** として定式化し、
(1) 相手の隠れ状態（努力値・性格補正・持ち物・技構成等）を **生成的粒子（Generative Particle）** により明示的に推定する belief tracker と、
(2) 行動を「技ID」ではなく **行動特徴ベクトル空間**に埋め込んで選択する **Latent Action Space** を、
(3) **PPO** により統合学習する枠組みを提示する。

本手法の設計原理は、従来の end-to-end（RNN暗黙推論）路線とは対照的に、ドメイン構造（型・定型分布・確定ログ）を **ベイズ推論として明示化**し、
**サンプル効率・解釈可能性・ルール変化耐性**を同時に確保する点にある。

---

## 1. POMDPとしての定式化
ポケモン対戦を POMDP \(\mathcal{P}\) として表す：

\[
\mathcal{P} = (\mathcal{S}, \mathcal{A}, \mathcal{O}, T, Z, R, \gamma)
\]

- \(\mathcal{S}\)：真の状態。自分・相手の場情報に加え、相手の隠れパラメータ（努力値、性格、持ち物、技など）を含む。
- \(\mathcal{A}\)：行動。技選択・交代・アイテム使用等。
- \(\mathcal{O}\)：観測。HP変動、先手後手、発動ログ（「オボンのみが発動」など）、天候・場の状態など。
- \(T(s'|s,a)\)：遷移確率。
- \(Z(o|s)\)：観測確率（真の状態から観測が生じる確率）。
- \(R(s,a,s')\)：報酬。
- \(\gamma\)：割引率。

エージェントは \(s_t\) を直接観測できず、観測履歴 \(o_{1:t}\) のみに基づき行動を選択する。
したがって、意思決定は「観測→内部信念（belief）→行動」の形式で定義される。

---

## 2. Belief State：Generative Particle による明示推定

### 2.1 Belief State の定義
相手の隠れ状態を \(m\) とし、belief を

\[
b_t(m) = P(m \mid o_{1:t})
\]

と定義する。実装上は粒子集合 \(\{(m_i, w_i)\}_{i=1}^N\) により近似する：

\[
b_t(m) \approx \sum_{i=1}^{N} w_i^{(t)} \, \delta(m=m_i), \quad \sum_i w_i^{(t)}=1.
\]

ここで重要なのは、粒子 \(m_i\) が「テンプレID」ではなく、**構造化された潜在パラメータの組（生成表現）**として定義される点である。
これにより、テンプレ列挙では表現困難な未知型（メタ外・変態構成）にも、近傍遷移や混入により到達可能となる。

---

### 2.2 粒子 \(m\) の最小構成（第4世代の「読み」を反映）
本研究では、初期マイルストーンとして「第4世代における対戦相手の最小構成要素」を次の4要素に圧縮する：

\[
m = (C_{\text{nature}}, C_{\text{ev}}, C_{\text{item}}, C_{\text{moves}})
\]

#### (1) 性格カテゴリ \(C_{\text{nature}}\)
性格補正の詳細（25種）ではなく、補正先の粗カテゴリに圧縮する：

- **SPEED+**（ようき/おくびょう等）
- **ATTACK+**（いじっぱり/ひかえめ等）
- **DEFENSE+**（わんぱく/ずぶとい/おだやか/しんちょう等）
- **NEUTRAL**（補正なし、両刀等）

この圧縮は、観測（先手後手・確定数）に対して最も支配的な方向性を保持しつつ、探索空間を抑制する。

#### (2) 努力値カテゴリ \(C_{\text{ev}}\)
努力値510の連続空間を扱うと粒子が退化するため、「極振り」を基本単位として離散化する（初期段階では微調整を無視）：

- **AS / CS**（速攻アタッカー）
- **HA / HC**（耐久寄りアタッカー）
- **HB / HD**（物理 / 特殊受け）
- **HS**（サポート・起点作成）

乱数幅・丸め誤差の存在を踏まえると、初期段階の識別はこの粒度でも十分成立する。

#### (3) 持ち物カテゴリ \(C_{\text{item}}\)
持ち物は機能ベースにグルーピングする：

- **CHOICE_SPEED**（こだわりスカーフ）
- **CHOICE_POWER**（ハチマキ/メガネ）
- **SASH**（きあいのタスキ）
- **HEAL**（たべのこし/オボンのみ等）
- **RECOIL**（いのちのたま）
- **CONTACT**（ゴツゴツメット等）
- **STATUS_CURE**（ラムのみ等）
- **NONE**（その他/不明）

確定ログ（例：たべのこし回復）は尤度を強く絞れるため、このカテゴリ化は推定の実用性に直結する。

#### (4) 技構成スロット \(C_{\text{moves}}\)（案B1：役割タグ）
技ID（約400種）を直接推定すると爆発するため、4枠を役割タグで表現する：

\[
C_{\text{moves}} = (r_1, r_2, r_3, r_4), \quad r_k \in \mathcal{R}
\]

\(\mathcal{R}\) は例として以下を含む：

- **STAB_MAIN**（タイプ一致主力）
- **STAB_SUB**（打ち分け/一致サブ）
- **COVERAGE**（相性補完サブ）
- **PRIORITY**（先制技）
- **BOOST**（積み技）
- **STATUS**（状態異常付与）
- **SUPPORT**（壁・ステロ・回復等）

この設計の要点は「技名を当てる」のではなく、対戦者が実際に行う推論（主力・補完・起点・妨害）を粒子として表現する点にある。

---

### 2.3 観測尤度：ダメージ乱数と技候補の周辺化（Rao-Blackwellization）
観測として最も情報量の高い信号の一つが「ダメージ」である。
第4世代のダメージ計算には乱数係数 \(r\in[0.85,1.0]\) が存在するため、
乱数を粒子の状態として追跡すると退化が激化する。

そこで本研究では、乱数 \(r\) を **周辺化（解析的に積分/消去）**し、粒子は離散仮説のみを追跡する：

\[
P(d_{\text{obs}} \mid m) = \int P(d_{\text{obs}} \mid m, r)\, P(r)\, dr
\]

初期実装では、乱数によるダメージ分布を一様近似し、
隠れ状態 \(m\) の下での最大ダメージを \(D_{\max}(m, x)\)（後述：技候補 \(x\) 依存）として、

\[
d \sim U(0.85 D_{\max}, D_{\max})
\]

と仮定する。すると密度としての尤度は区間で定義される：

\[
p(d_{\text{obs}} \mid m, x) \approx
\begin{cases}
\frac{1}{0.15\, D_{\max}(m, x)} & \text{if } 0.85 D_{\max}(m, x) \le d_{\text{obs}} \le D_{\max}(m, x) \\
\epsilon & \text{otherwise}
\end{cases}
\]

#### 技候補の周辺化（役割タグ→可用技集合）
粒子は技名を持たないため、役割タグ \(r_k\) から具体技候補集合 \(\mathcal{X}(m)\) を生成し、技を周辺化する：

\[
P(d_{\text{obs}} \mid m) \;=\; \sum_{x \in \mathcal{X}(m)} P(x \mid m)\, P(d_{\text{obs}} \mid m, x)
\]

- \(\mathcal{X}(m)\)：種族の可用技から、タグ条件（STAB_MAIN等）を満たすものを抽出した集合
- \(P(x \mid m)\)：技候補の事前分布（均等、または使用率統計に基づく重み付け）

この周辺化により、**「代表スペック1個」による尤度の不安定化**（技の取り違えで粒子が不当に死ぬ問題）を抑制できる。
また、粒子が追跡するのは「役割」レベルの構造でありつつ、ダメージ尤度は具体技候補を通じて現実の計算に接続される。

---

### 2.4 尤度の分解：ダメージ以外の確定ログ・速度情報
ダメージだけでは識別が困難な潜在変数（スカーフ等）は、観測ログが強い拘束になる。
よって尤度を複数要素の積として分解する：

\[
L(m) = L_{\text{dmg}}(m)\cdot L_{\text{spd}}(m)\cdot L_{\text{log}}(m)
\]

- \(L_{\text{dmg}}(m)=P(d_{\text{obs}}\mid m)\)：上記の周辺化ダメージ尤度
- \(L_{\text{spd}}(m)\)：先手/後手観測（速度カテゴリ・スカーフ等）との整合
- \(L_{\text{log}}(m)\)：確定ログ（たべのこし回復、オボン発動、やけど/まひ等）との整合

特に確定ログは「そのカテゴリ以外をほぼ排除」でき、粒子多様性を保ったまま情報を急速に集約できる。

---

### 2.5 重み更新・正規化・ESS・リサンプリング
粒子の重み更新はベイズ則に基づく：

\[
\tilde{w}_i^{(t)} = w_i^{(t-1)} \cdot L(m_i), \quad
w_i^{(t)} = \frac{\tilde{w}_i^{(t)}}{\sum_j \tilde{w}_j^{(t)}}
\]

退化判定として有効サンプルサイズ（ESS）を用いる：

\[
\text{ESS} = \frac{1}{\sum_i (w_i^{(t)})^2}
\]

\(\text{ESS}\) が閾値（例：\(\alpha N\)）を下回る場合、リサンプリングを実施する。

---

### 2.6 退化対策：Mixture Proposal と Rejuvenation（MCMC近傍遷移）
標準的なリサンプリングのみでは、離散かつ組合せ爆発的な仮説空間において多様性が崩壊しやすい。
そこで以下の2機構を導入する。

#### (A) Mixture Proposal（事前分布からの混入）
各更新で一定割合 \(\rho\)（例：5〜10%）の粒子を事前分布 \(p(m)\) から再生成し混入する。
これにより「メタ外・予想外」の型への追従可能性を維持する。

#### (B) Rejuvenation（MCMC / 近傍遷移）
リサンプリング後に粒子を近傍へ確率的に移動させ、多様性を回復させる。
提案分布 \(q(m' \mid m)\) を「局所的操作」によって定義する（例：技タグ1枠変更、持ち物カテゴリ変更等）。
Metropolis-Hastings の受理確率は

\[
\alpha = \min\left(
1,\;
\frac{P(o_{1:t}\mid m')\, p(m')\, q(m\mid m')}
{P(o_{1:t}\mid m )\, p(m )\, q(m'\mid m)}
\right)
\]

で与えられる。これにより、テンプレ列挙ではなく **生成表現に基づく探索**が可能となる。

---

### 2.7 Belief の要約表現（policy入力）
粒子分布そのものは高次元で扱いにくいため、以下の要約を policy への入力とする。

#### (1) 期待埋め込み
粒子 \(m\) を埋め込み \(e(m)\) に写像し、

\[
\mathbb{E}[e(m)] = \sum_i w_i\, e(m_i)
\]

を信念状態の代表表現とする。

#### (2) 不確実性（エントロピー）
\[
H(b_t) = -\sum_i w_i \log w_i
\]

を追加し、「推定が曖昧である」こと自体を方策に伝達する。
これにより、情報獲得を意図した行動（様子見・安全択・誘い出し等）が発現しうる。

---

## 3. Latent Action Space：Embedding + Masked Softmax による行動選択

### 3.1 行動埋め込み
各具体行動 \(a\in\mathcal{A}\)（技・交代・アイテム等）を固定長ベクトルに埋め込む：

\[
e(a)\in\mathbb{R}^d
\]

ここで \(e(a)\) は **カタログスペック**（威力・命中・タイプ・追加効果属性等）を表す。
「追加効果の価値」は状態依存であるため、価値判断は後述の policy 側に委ねる。

### 3.2 意図ベクトルとスコアリング
policy network は状態表現 \(s\) から意図ベクトルを出力する：

\[
z_\theta(s)\in\mathbb{R}^d
\]

利用可能行動集合を \(\mathcal{A}_s\)（action mask適用後）として、logit を

\[
\ell(s,a) = \frac{z_\theta(s)^\top e(a)}{\tau}
\]

で定義し、masked softmax により方策分布を得る：

\[
\pi_\theta(a\mid s)=
\frac{\exp(\ell(s,a))}
{\sum_{a'\in\mathcal{A}_s}\exp(\ell(s,a'))}
\]

この構成は完全に微分可能であり、PPO の Actor と自然に接続できる。
また、「スペック（\(e(a)\)）」と「欲求（\(z_\theta(s)\)）」が分離されるため、
技追加・世代変更に対する汎化（transfer）を主張可能である。

---

## 4. 学習アルゴリズム：PPO（概念定義）
PPO は、行動確率比

\[
r_t(\theta)=\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}
\]

を用い、クリップ付き目的関数を最大化する（標準形）。
本研究では Actor が上記の masked softmax により定義されるため、
勾配は \(\ell(s,a)\rightarrow z_\theta(s)\rightarrow\theta\) と安定して伝播する。

---

## 5. 報酬設計：Potential-based Reward Shaping（PBRS）

### 5.1 基本報酬
勝敗による疎な報酬：

- 勝利：+1
- 敗北：-1

### 5.2 ポテンシャル関数
学習を安定化するため、勝利条件と整合する進捗指標をポテンシャルとして与える。
各サイド \(X\in\{\text{self},\text{opp}\}\) に対して

- 正規化HP総和：
\[
\text{HP}_X(s)=\sum_{i\in X}\frac{h_i}{h_i^{\max}}
\]

- 生存数：
\[
\text{Alive}_X(s)=\sum_{i\in X}\mathbf{1}[h_i>0]
\]

を定義し、ポテンシャルを

\[
\Phi(s)=
\lambda_{\text{hp}}(\text{HP}_{\text{self}}-\text{HP}_{\text{opp}})
+
\lambda_{\text{alive}}(\text{Alive}_{\text{self}}-\text{Alive}_{\text{opp}})
\]

とする。

### 5.3 PBRS shaping
\[
F(s,a,s')=\gamma\Phi(s')-\Phi(s)
\]
\[
R'(s,a,s')=R_{\text{win}}(s,a,s')+\eta F(s,a,s')
\]

PBRS は最適方策を変えずに学習を加速しうる（Ng et al. の枠組みに整合）。
特に本ドメインでは「HP差・残数差」が勝敗と強く整合するため、安定化に寄与する。

---

## 6. 本手法の意義（差別化点）
本手法は、AlphaStar / OpenAI Five に代表される「大規模計算による暗黙推論」路線と異なり、

1. **相手推定を粒子分布として明示**（解釈可能性）
2. **ダメージ乱数・技候補を周辺化**し、退化を抑えつつ効率推定（Rao-Blackwellization）
3. **役割タグによる生成表現**により、組合せ爆発を現実的に抑制
4. **不確実性（エントロピー）を入力**として、情報収集行動の発現を検証可能
5. **Latent Action Space** による汎化性能（技追加・世代変更）を主張可能

という点で、「ドメイン構造を活用した Bayesian RL」の実証例として位置付けられる。

---

## 7. 付記：実装フェーズの段階性（研究としての再現性）
本稿の粒子設計は段階的拡張を前提とする。

- **Phase 1**：タグ粒子 + ダメージ/速度/確定ログ尤度 + Mixture混入
- **Phase 2**：Rejuvenation（近傍遷移）導入、カテゴリ粒度の拡張（S調整等）
- **Phase 3**：技タグの高度化（役割→候補集合のprior学習）、状態遷移尤度の精緻化

段階性を明示することで、設計の妥当性・再現性・拡張性を担保する。

---

## 参考文献

1. **Kaelbling, L. P., Littman, M. L., & Cassandra, A. R.** (1998). Planning and acting in partially observable stochastic domains. *Artificial Intelligence*, 101(1-2), 99-134.

2. **Ng, A. Y., Harada, D., & Russell, S.** (1999). Policy invariance under reward shaping. *ICML*.

3. **Silver, D., et al.** (2016). Mastering the game of Go with deep neural networks and tree search. *Nature*, 529(7587), 484-489.

4. **Vinyals, O., et al.** (2019). Grandmaster level in StarCraft II using multi-agent reinforcement learning. *Nature*, 575(7782), 350-354.

5. **Doucet, A., & Johansen, A. M.** (2009). A tutorial on particle filtering and smoothing: Fifteen years later. *Handbook of nonlinear filtering*, 12(656-704), 3.

6. **Schulman, J., Wolski, F., Dhariwal, P., Radford, A., & Klimov, O.** (2017). Proximal policy optimization algorithms. *arXiv preprint arXiv:1707.06347*.
