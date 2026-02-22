import "./stock-tax-2026.css";

export default function StockTax2026Guide() {
  return (
    <div data-guide-article data-guide="stock-tax-2026">
      <div className="container">

        {/* Hero */}
        <div className="hero">
          <div className="badge">2026년 2월 기준 · 최신 세법 반영</div>
          <h1>주식 세금,<br />이것만 알면 끝.</h1>
          <p>국내 주식부터 해외 주식까지 — 투자할 때 꼭 알아야 할 세금의 종류와 세율을 한 곳에 정리했습니다.</p>
        </div>

        {/* Navigation */}
        <div className="nav-pills">
          <a className="pill" href="#sec-trade"><span className="dot" style={{ background: "var(--guide-sell)" }}></span>증권거래세</a>
          <a className="pill" href="#sec-dividend"><span className="dot" style={{ background: "var(--guide-dividend)" }}></span>배당소득세</a>
          <a className="pill" href="#sec-capital"><span className="dot" style={{ background: "var(--guide-gain)" }}></span>양도소득세</a>
          <a className="pill" href="#sec-overseas"><span className="dot" style={{ background: "var(--guide-overseas)" }}></span>해외주식</a>
        </div>

        {/* Overview */}
        <div className="overview">
          <div className="ov-card">
            <div className="ov-icon" style={{ background: "var(--guide-sell-soft)" }}>💸</div>
            <h3 style={{ color: "var(--guide-sell)" }}>증권거래세</h3>
            <p>주식을 <strong>팔 때</strong><br />이익·손실 무관, 무조건</p>
          </div>
          <div className="ov-card">
            <div className="ov-icon" style={{ background: "var(--guide-dividend-soft)" }}>🎁</div>
            <h3 style={{ color: "var(--guide-dividend)" }}>배당소득세</h3>
            <p>배당금 <strong>받을 때</strong><br />15.4% 자동 차감</p>
          </div>
          <div className="ov-card">
            <div className="ov-icon" style={{ background: "var(--guide-gain-soft)" }}>📈</div>
            <h3 style={{ color: "var(--guide-gain)" }}>양도소득세</h3>
            <p>팔아서 <strong>이익 났을 때</strong><br />국내는 대주주만</p>
          </div>
          <div className="ov-card">
            <div className="ov-icon" style={{ background: "var(--guide-overseas-soft)" }}>🌏</div>
            <h3 style={{ color: "var(--guide-overseas)" }}>해외주식 세금</h3>
            <p>미국·일본 등 해외 투자 시<br />양도세 + 배당세</p>
          </div>
        </div>


        {/* SECTION 1: 증권거래세 */}
        <div className="section" id="sec-trade">
          <div className="section-bar">
            <div className="section-num" style={{ background: "var(--guide-sell)" }}>1</div>
            <h2>증권거래세</h2>
            <span className="subtitle">팔면 무조건 내는 세금</span>
          </div>

          <div className="explain">
            <p>주식을 <strong>매도(팔기)할 때마다</strong> 자동으로 빠져나가는 세금입니다. 매매 결과가 이익이든 손실이든 관계없이, 판 금액 자체에 일정 비율로 부과됩니다.</p>
            <div className="callout sell">
              <strong>핵심:</strong> &quot;팔았다 = 세금 발생&quot;으로 기억하면 됩니다. 증권사가 매도 시점에 알아서 원천징수하기 때문에 별도 신고는 필요 없어요.
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-title">📊 시장별 증권거래세율 (2026년 1월~)</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>시장</th><th>증권거래세</th><th>농어촌특별세</th><th>합계</th><th>변동</th><th>신고</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>코스피</strong></td>
                    <td>0.05%</td><td>0.15%</td>
                    <td><span className="rate sell">0.20%</span></td>
                    <td><span className="tag warn">↑ +0.05%p</span></td>
                    <td><span className="tag auto">자동</span></td>
                  </tr>
                  <tr>
                    <td><strong>코스닥</strong></td>
                    <td>0.20%</td><td>—</td>
                    <td><span className="rate sell">0.20%</span></td>
                    <td><span className="tag warn">↑ +0.05%p</span></td>
                    <td><span className="tag auto">자동</span></td>
                  </tr>
                  <tr>
                    <td><strong>코넥스</strong></td>
                    <td>0.10%</td><td>—</td>
                    <td><span className="rate sell">0.10%</span></td>
                    <td><span className="tag none">유지</span></td>
                    <td><span className="tag auto">자동</span></td>
                  </tr>
                  <tr>
                    <td><strong>K-OTC</strong></td>
                    <td>0.20%</td><td>—</td>
                    <td><span className="rate sell">0.20%</span></td>
                    <td><span className="tag warn">↑ +0.05%p</span></td>
                    <td><span className="tag auto">자동</span></td>
                  </tr>
                  <tr>
                    <td><strong>장외거래</strong></td>
                    <td>0.35%</td><td>—</td>
                    <td><span className="rate sell">0.35%</span></td>
                    <td><span className="tag none">유지</span></td>
                    <td><span className="tag self">직접 신고</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="example">
            <div className="example-title">🧮 계산 예시 — 코스피에서 3,000만원어치 매도 시</div>
            <div className="calc-row"><span className="calc-label">매도 금액</span><span className="calc-value">30,000,000원</span></div>
            <div className="calc-row"><span className="calc-label">× 세율 (코스피)</span><span className="calc-value">× 0.20%</span></div>
            <div className="calc-result" style={{ background: "var(--guide-sell-soft)" }}>
              <span className="label" style={{ color: "var(--guide-sell)" }}>증권거래세</span>
              <span className="amount" style={{ color: "var(--guide-sell)" }}>60,000원</span>
            </div>
          </div>

          <div className="tip red">
            <span className="tip-icon">⚠️</span>
            <div>
              <strong>2026년 변경사항 —</strong> 2025년까지 코스피 증권거래세는 0%(농특세 0.15%만 부과)였지만, 금투세 폐지 이후 세수 확충 차원에서 0.05%가 부활했습니다. 코스닥도 0.15% → 0.20%로 인상. 자주 매매하는 분이라면 체감 비용이 커질 수 있어요.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.law.go.kr/법령/증권거래세법" target="_blank" rel="noopener"><span className="s-icon">📄</span> 증권거래세법</a>
            <a className="source-link" href="https://www.nts.go.kr" target="_blank" rel="noopener"><span className="s-icon">🏛️</span> 국세청</a>
            <a className="source-link" href="https://www.moef.go.kr" target="_blank" rel="noopener"><span className="s-icon">📋</span> 기획재정부 2025 세제개편안</a>
            <a className="source-link" href="https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1701&ccfNo=2&cciNo=3&cnpClsNo=1" target="_blank" rel="noopener"><span className="s-icon">📖</span> 찾기쉬운 생활법령</a>
          </div>
        </div>


        {/* SECTION 2: 배당소득세 */}
        <div className="section" id="sec-dividend">
          <div className="section-bar">
            <div className="section-num" style={{ background: "var(--guide-dividend)" }}>2</div>
            <h2>배당소득세</h2>
            <span className="subtitle">배당금에 붙는 세금</span>
          </div>

          <div className="explain">
            <p>기업이 이익을 주주에게 나눠주는 것을 <strong>배당</strong>이라 합니다. 이 배당금을 받을 때 세금이 자동으로 빠지는데, 이게 배당소득세예요.</p>
            <div className="callout div">
              <strong>핵심:</strong> 기본 세율은 <strong>15.4%</strong>(소득세 14% + 지방소득세 1.4%). 연간 금융소득(이자 + 배당)이 2,000만원을 넘으면 다른 소득과 합쳐서 종합과세됩니다.
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-title">📊 배당소득세 세율 구조</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>상황</th><th>세율</th><th>과세 방식</th><th>신고</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>금융소득 2,000만원 이하</strong></td>
                    <td><span className="rate div">15.4%</span></td>
                    <td>원천징수로 끝 (분리과세)</td>
                    <td><span className="tag auto">자동</span></td>
                  </tr>
                  <tr>
                    <td><strong>금융소득 2,000만원 초과</strong></td>
                    <td><span className="rate div">6~45%</span></td>
                    <td>초과분을 다른 소득과 합산 (종합과세)</td>
                    <td><span className="tag self">5월 신고</span></td>
                  </tr>
                  <tr>
                    <td><strong>고배당기업 분리과세</strong> <span className="tag new">2026 신설</span></td>
                    <td><span className="rate div">14~30%</span></td>
                    <td>배당성향 40%↑ 기업 · 종합과세 제외</td>
                    <td><span className="tag auto">2천만원↓ 자동</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="example">
            <div className="example-title">🧮 계산 예시 — 연간 배당금 500만원 수령 시</div>
            <div className="calc-row"><span className="calc-label">배당금 총액</span><span className="calc-value">5,000,000원</span></div>
            <div className="calc-row"><span className="calc-label">× 배당소득세율</span><span className="calc-value">× 15.4%</span></div>
            <div className="calc-row"><span className="calc-label">세금</span><span className="calc-value">- 770,000원</span></div>
            <div className="calc-result" style={{ background: "var(--guide-dividend-soft)" }}>
              <span className="label" style={{ color: "var(--guide-dividend)" }}>실수령 배당금</span>
              <span className="amount" style={{ color: "var(--guide-dividend)" }}>4,230,000원</span>
            </div>
          </div>

          <div className="tip green">
            <span className="tip-icon">✨</span>
            <div>
              <strong>2026년 고배당 분리과세 도입 —</strong> 배당성향 40% 이상인 상장기업 주주라면 배당소득을 종합소득에 합산하지 않고 별도 세율(최대 25~30%)로 분리과세 받을 수 있게 되었습니다. 기존 종합과세 최고 49.5%에 비하면 크게 유리합니다.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.law.go.kr/법령/소득세법" target="_blank" rel="noopener"><span className="s-icon">📄</span> 소득세법 제127조</a>
            <a className="source-link" href="https://investpension.miraeasset.com/contents/view.do?idx=25311" target="_blank" rel="noopener"><span className="s-icon">📋</span> 미래에셋 2026 개정세법</a>
            <a className="source-link" href="https://www.tossbank.com/articles/dividend-income-separate-taxation" target="_blank" rel="noopener"><span className="s-icon">🏦</span> 토스뱅크 배당소득 분리과세</a>
          </div>
        </div>


        {/* SECTION 3: 양도소득세 */}
        <div className="section" id="sec-capital">
          <div className="section-bar">
            <div className="section-num" style={{ background: "var(--guide-gain)" }}>3</div>
            <h2>양도소득세 (국내)</h2>
            <span className="subtitle">팔아서 이익 났을 때</span>
          </div>

          <div className="explain">
            <p>주식을 매수할 때보다 비싸게 매도해서 <strong>차익(이익)이 생겼을 때</strong> 내는 세금입니다.</p>
            <p>국내 상장주식(코스피·코스닥)은 거래소를 통해 매매하는 <strong>일반 개인투자자에게는 양도소득세가 없습니다.</strong> 대주주이거나 장외거래 등 특수한 경우에만 과세돼요.</p>
            <div className="callout gain">
              <strong>간단 정리:</strong> &quot;나는 그냥 증권사 앱으로 코스피·코스닥 거래한다&quot; → 양도소득세 해당 없음. 대주주(50억↑ 보유 또는 지분 1%↑)이거나, 비상장·장외거래라면 과세 대상.
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-title">📊 국내 주식 양도소득세 — 누가 내나?</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>구분</th><th>과세 여부</th><th>세율 (지방세 포함)</th><th>비고</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>상장주식 소액주주</strong><br />거래소 매매</td>
                    <td><span className="tag none">비과세 ✅</span></td>
                    <td>—</td>
                    <td>대부분의 개인투자자</td>
                  </tr>
                  <tr>
                    <td><strong>상장주식 대주주</strong><br />(50억↑ 또는 지분 1%↑)</td>
                    <td><span className="tag self">과세</span></td>
                    <td><span className="rate gain">22%</span> (3억↓) / <span className="rate gain">27.5%</span> (3억↑)</td>
                    <td>반기별 예정신고 + 5월 확정신고</td>
                  </tr>
                  <tr>
                    <td><strong>비상장주식</strong></td>
                    <td><span className="tag self">과세</span></td>
                    <td><span className="rate gain">22%</span> (중소기업 11%)</td>
                    <td>대주주·소액주주 모두</td>
                  </tr>
                  <tr>
                    <td><strong>장외거래</strong><br />(거래소 밖)</td>
                    <td><span className="tag self">과세</span></td>
                    <td><span className="rate gain">22~27.5%</span></td>
                    <td>소액주주도 과세</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=12274&cntntsId=8800" target="_blank" rel="noopener"><span className="s-icon">🏛️</span> 국세청 양도소득세 안내</a>
            <a className="source-link" href="https://www.law.go.kr/법령/소득세법시행령/제157조" target="_blank" rel="noopener"><span className="s-icon">📄</span> 소득세법 시행령 §157</a>
            <a className="source-link" href="https://kbthink.com/main/asset-management/wealth-manage-tip/kbthink-original/202410/kr-stocktax.html" target="_blank" rel="noopener"><span className="s-icon">🏦</span> KB Think 국내주식 세금</a>
          </div>
        </div>


        {/* SECTION 4: 해외 주식 세금 */}
        <div className="section" id="sec-overseas">
          <div className="section-bar">
            <div className="section-num" style={{ background: "var(--guide-overseas)" }}>4</div>
            <h2>해외주식 세금</h2>
            <span className="subtitle">미국·일본·중국·홍콩 등</span>
          </div>

          <div className="explain">
            <p>해외 주식은 국내와 규칙이 다릅니다. 크게 두 가지를 기억하세요.</p>
            <p>① <strong>양도소득세</strong> — 팔아서 생긴 이익에 대해, 대주주가 아니어도 <strong>누구나</strong> 내야 합니다.<br />
               ② <strong>배당소득세</strong> — 현지 국가에서 먼저 세금을 떼고, 부족분이 있으면 한국에서 추가 징수합니다.</p>
            <div className="callout over">
              <strong>국내와 가장 큰 차이:</strong> 국내 상장주식은 일반 투자자에게 양도세가 없지만, 해외 주식은 연 250만원 넘게 벌면 누구든 양도세를 내야 하고, 자동징수가 아니라 <strong>직접 신고</strong>해야 합니다.
            </div>
          </div>

          {/* 국내 vs 해외 비교 */}
          <div className="compare-grid">
            <div className="compare-card">
              <div className="cc-header" style={{ background: "var(--guide-gain)" }}>🇰🇷 국내 주식</div>
              <ul className="cc-body">
                <li>상장주식 일반투자자는 양도세 <strong>비과세</strong></li>
                <li>증권거래세는 매도 시 <strong>자동 징수</strong></li>
                <li>배당소득세 15.4% <strong>자동 원천징수</strong></li>
                <li>대부분 신고할 것이 없음</li>
              </ul>
            </div>
            <div className="compare-card">
              <div className="cc-header" style={{ background: "var(--guide-overseas)" }}>🌏 해외 주식</div>
              <ul className="cc-body">
                <li>이익 250만원 초과 시 양도세 <strong>22%</strong></li>
                <li>증권거래세 <strong>없음</strong> (미국 등 대부분)</li>
                <li>배당세는 현지에서 먼저 원천징수</li>
                <li>매년 5월에 <strong>직접 신고·납부</strong> 필수</li>
              </ul>
            </div>
          </div>

          {/* 해외 양도소득세 */}
          <div className="table-wrap">
            <div className="table-title">📊 해외주식 양도소득세 — 한국 거주자 기준</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>구분</th><th>기본공제</th><th>세율 (지방세 포함)</th><th>신고 시기</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>과세표준 3억원 이하</strong></td>
                    <td>연 250만원</td>
                    <td><span className="rate over">22%</span></td>
                    <td rowSpan={2}>다음 해 5월 1~31일<br />홈택스 확정신고</td>
                  </tr>
                  <tr>
                    <td><strong>과세표준 3억원 초과</strong></td>
                    <td>연 250만원</td>
                    <td><span className="rate over">27.5%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="example">
            <div className="example-title">🧮 계산 예시 — 미국 주식(엔비디아 등)으로 연간 1,200만원 수익 시</div>
            <div className="calc-row"><span className="calc-label">연간 순수익</span><span className="calc-value">12,000,000원</span></div>
            <div className="calc-row"><span className="calc-label">- 기본공제</span><span className="calc-value">- 2,500,000원</span></div>
            <div className="calc-row"><span className="calc-label">= 과세표준</span><span className="calc-value">9,500,000원</span></div>
            <div className="calc-row"><span className="calc-label">× 세율</span><span className="calc-value">× 22%</span></div>
            <div className="calc-result" style={{ background: "var(--guide-overseas-soft)" }}>
              <span className="label" style={{ color: "var(--guide-overseas)" }}>납부할 양도소득세</span>
              <span className="amount" style={{ color: "var(--guide-overseas)" }}>2,090,000원</span>
            </div>
          </div>

          <div className="tip purple">
            <span className="tip-icon">💡</span>
            <div>
              <strong>손익통산 활용 —</strong> 같은 해에 엔비디아에서 1,200만원 이익, 테슬라에서 500만원 손실이 났다면 순수익은 700만원. 여기서 250만원 공제하면 과세표준은 450만원, 세금은 약 99만원으로 절반 이상 줄어듭니다. 또한 2020년부터 과세대상 국내주식(대주주 양도 등)과 해외주식 간에도 손익통산이 가능합니다.
            </div>
          </div>

          {/* 해외 배당소득세 */}
          <div className="table-wrap">
            <div className="table-title">📊 국가별 해외주식 배당소득세</div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>국가</th><th>현지 원천징수</th><th>한국 추가 징수</th><th>최종 세 부담</th><th>설명</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🇺🇸 <strong>미국</strong></td>
                    <td><span className="rate over">15%</span></td>
                    <td>0%</td>
                    <td>15%</td>
                    <td>한국 세율(14%)보다 높아 추가 징수 없음</td>
                  </tr>
                  <tr>
                    <td>🇯🇵 <strong>일본</strong></td>
                    <td><span className="rate over">15.315%</span></td>
                    <td>0%</td>
                    <td>15.315%</td>
                    <td>한국보다 높아 추가 징수 없음</td>
                  </tr>
                  <tr>
                    <td>🇨🇳 <strong>중국</strong></td>
                    <td><span className="rate over">10%</span></td>
                    <td>4.4%</td>
                    <td>14.4%</td>
                    <td>한국 14%에서 중국 10% 뺀 4% + 지방세 0.4%</td>
                  </tr>
                  <tr>
                    <td>🇭🇰 <strong>홍콩</strong></td>
                    <td><span className="rate over">0%</span></td>
                    <td>15.4%</td>
                    <td>15.4%</td>
                    <td>현지 세금이 없어 한국에서 전액 과세</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="explain">
            <p><strong>어떻게 작동하나요?</strong></p>
            <p>한국의 배당소득세율은 14%(지방세 별도 1.4%)입니다. 해외에서 먼저 원천징수된 세율이 14%보다 높으면 한국에서 추가 징수 없이 끝나고, 낮으면 차액만큼 한국에서 추가로 떼갑니다.</p>
            <p>연간 금융소득이 2,000만원을 넘으면 해외 배당도 종합과세 대상이 됩니다. 이때 해외에서 낸 세금은 <strong>외국납부세액공제</strong>로 이중과세를 방지할 수 있어요.</p>
          </div>

          <div className="tip purple">
            <span className="tip-icon">📋</span>
            <div>
              <strong>해외주식 세금 신고 체크리스트</strong><br />
              ① 매년 1/1~12/31 거래분을 기준으로, <strong>다음 해 5월</strong>에 홈택스에서 신고<br />
              ② 증권사 앱에서 &quot;양도소득세 보조자료&quot;를 다운로드하면 계산이 편리<br />
              ③ 미신고 시 가산세: 무신고 20%, 과소신고 10% + 납부지연 가산세 별도<br />
              ④ 250만원 이하 수익이면 세금은 없지만, 공식적으로는 신고 의무 있음
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=12274&cntntsId=8800" target="_blank" rel="noopener"><span className="s-icon">🏛️</span> 국세청 세액계산요령</a>
            <a className="source-link" href="https://kbthink.com/main/asset-management/wealth-manage-tip/kbthink-original/202409/foreignstocktax.html" target="_blank" rel="noopener"><span className="s-icon">🏦</span> KB Think 해외주식 세금</a>
            <a className="source-link" href="https://www.tossbank.com/articles/overseas-capital-gains-tax" target="_blank" rel="noopener"><span className="s-icon">🏦</span> 토스뱅크 해외주식 양도세</a>
            <a className="source-link" href="https://www.truefriend.com/main/bond/research/_static/TF03ca030100.jsp" target="_blank" rel="noopener"><span className="s-icon">📊</span> 한국투자증권 양도세 안내</a>
            <a className="source-link" href="https://www.daolsecurities.com/customer/guide/overseasStock04.jsp" target="_blank" rel="noopener"><span className="s-icon">📊</span> 다올증권 해외주식 세금</a>
          </div>
        </div>


        {/* 절세 팁 */}
        <div className="section" id="sec-tips">
          <div className="section-bar">
            <div className="section-num" style={{ background: "var(--guide-accent)" }}>💡</div>
            <h2>알아두면 좋은 절세 팁</h2>
          </div>

          <div className="explain">
            <p><strong>1. 매도 시점 분산하기</strong> — 해외주식 수익이 크다면 한 번에 다 팔지 말고, 연말·연초로 나눠 매도하면 250만원 공제를 두 번 받을 수 있습니다.</p>
            <p><strong>2. 손익통산 활용</strong> — 수익이 난 종목과 손실이 난 종목을 같은 해에 함께 정리하면, 이익과 손실이 상쇄되어 과세 대상 금액이 줄어듭니다.</p>
            <p><strong>3. ISA(개인종합자산관리계좌) 활용</strong> — ISA 계좌 내 투자 수익은 비과세 한도(일반형 최대 500만원 추진 중)까지 세금 면제, 초과분도 9.9% 저율과세입니다.</p>
            <p><strong>4. 증여를 통한 취득가 리셋</strong> — 배우자에게 6억원까지 증여세 없이 주식을 넘긴 후 매도하면 취득가가 증여 시점 시가로 재설정되어 양도차익을 줄일 수 있습니다.</p>
            <div className="callout accent">
              <strong>참고:</strong> 세금 전략은 개인 상황에 따라 달라집니다. 금액이 크다면 세무사와 상담을 권장합니다.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.tossbank.com/articles/stocktax" target="_blank" rel="noopener"><span className="s-icon">🏦</span> 토스뱅크 · 국세청 주식과 세금</a>
            <a className="source-link" href="https://www.kcie.or.kr/mobile/guide/23/30/web_view?series_idx=&content_idx=1327" target="_blank" rel="noopener"><span className="s-icon">📖</span> 자본시장연구원 절세가이드</a>
          </div>
        </div>


        {/* Summary */}
        <div className="summary">
          <h2>📌 한눈에 보기</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="emoji">💸</div>
              <h4>증권거래세</h4>
              <p>매도 시 자동 징수<br />코스피·코스닥 0.20%<br />손실에도 부과</p>
            </div>
            <div className="summary-item">
              <div className="emoji">🎁</div>
              <h4>배당소득세</h4>
              <p>배당금의 15.4%<br />2천만원↑ 종합과세<br />고배당 분리과세 신설</p>
            </div>
            <div className="summary-item">
              <div className="emoji">📈</div>
              <h4>양도세 (국내)</h4>
              <p>일반투자자 비과세<br />대주주만 22~27.5%<br />비상장은 모두 과세</p>
            </div>
            <div className="summary-item">
              <div className="emoji">🌏</div>
              <h4>양도세 (해외)</h4>
              <p>250만원 공제 후 22%<br />5월 직접 신고 필수<br />국가별 배당세 상이</p>
            </div>
          </div>
        </div>


        {/* Footer */}
        <div className="footer">

          {/* 참고 법령 및 자료 */}
          <div className="footer-section">
            <div className="footer-section-header">📚 참고 법령 및 자료</div>
            <div className="footer-section-body">
              <ul>
                <li><a href="https://www.law.go.kr/법령/증권거래세법" target="_blank" rel="noopener">증권거래세법</a> 및 동법 시행령 (2026.1.1. 시행)</li>
                <li><a href="https://www.law.go.kr/법령/소득세법" target="_blank" rel="noopener">소득세법</a> 제94조(양도소득 범위), 제127조(원천징수), 시행령 제157조(대주주 기준)</li>
                <li><a href="https://www.moef.go.kr" target="_blank" rel="noopener">기획재정부</a> — 2025년 세제개편안 (2025.7.31. 발표, 2026.1.1. 시행)</li>
                <li><a href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=12274&cntntsId=8800" target="_blank" rel="noopener">국세청</a> — 주식 양도소득세 세액계산요령</li>
                <li><a href="https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1701&ccfNo=2&cciNo=3&cnpClsNo=1" target="_blank" rel="noopener">찾기쉬운 생활법령정보</a> — 주식거래에 따른 세금 납부하기 (2026.1.15. 기준)</li>
                <li><a href="https://investpension.miraeasset.com/contents/view.do?idx=25311" target="_blank" rel="noopener">미래에셋 투자와연금센터</a> — 2026년 확인해야 할 개정 세법</li>
                <li><a href="https://shinkim.com/kor/media/newsletter/2925" target="_blank" rel="noopener">김·장 법률사무소</a> — 2025년 세제개편안 II: 주주과세 분야</li>
              </ul>
            </div>
          </div>

          {/* 해외주식 관련 자료 */}
          <div className="footer-section">
            <div className="footer-section-header">🌏 해외주식 세금 참고 자료</div>
            <div className="footer-section-body">
              <ul>
                <li><a href="https://kbthink.com/main/asset-management/wealth-manage-tip/kbthink-original/202409/foreignstocktax.html" target="_blank" rel="noopener">KB Think</a> — 해외주식 양도소득세, 미국 주식 세금 안내</li>
                <li><a href="https://www.tossbank.com/articles/overseas-capital-gains-tax" target="_blank" rel="noopener">토스뱅크</a> — 해외주식 양도소득세 계산 및 절세 전략</li>
                <li><a href="https://www.truefriend.com/main/bond/research/_static/TF03ca030100.jsp" target="_blank" rel="noopener">한국투자증권</a> — 양도소득세 안내 (해외투자와 세금)</li>
                <li><a href="https://www.daolsecurities.com/customer/guide/overseasStock04.jsp" target="_blank" rel="noopener">다올투자증권</a> — 해외주식 세금 안내 (국가별 배당세율)</li>
                <li><a href="https://www.tossbank.com/articles/stocktax" target="_blank" rel="noopener">토스뱅크</a> — 국세청이 알려주는 주식 세금 아끼는 법</li>
              </ul>
            </div>
          </div>

          {/* 면책 고지 */}
          <div className="footer-section" style={{ borderColor: "#D4D4CF" }}>
            <div className="footer-section-header">⚖️ 면책 고지 (Disclaimer)</div>
            <div className="footer-section-body">
              <p><strong>정보 제공 목적의 자료입니다.</strong> 본 페이지에 수록된 내용은 2026년 2월 20일 기준, 공개된 법령·시행령·정부 발표자료·금융기관 안내 자료 등을 참고하여 일반적인 정보 제공을 목적으로 작성된 것입니다.</p>
              <p><strong>세무·법률 자문이 아닙니다.</strong> 본 자료는 특정 개인의 재무 상황에 대한 맞춤형 세무 자문, 법률 자문, 또는 투자 권유에 해당하지 않습니다. 구체적인 세금 계산, 신고, 절세 전략에 대해서는 세무사·회계사·법률 전문가와 별도로 상담하시기 바랍니다.</p>
              <p><strong>정확성의 한계.</strong> 세법, 시행령, 고시 등은 수시로 개정될 수 있으며, 본 자료에 포함된 세율·공제 금액·과세 기준 등이 열람 시점의 최신 법령과 다를 수 있습니다. 최종적으로는 <a href="https://www.law.go.kr" target="_blank" rel="noopener">국가법령정보센터</a>, <a href="https://www.nts.go.kr" target="_blank" rel="noopener">국세청</a>(☎ 126), 또는 <a href="https://www.hometax.go.kr" target="_blank" rel="noopener">홈택스</a>를 통해 확인해 주세요.</p>
              <p><strong>손해에 대한 책임.</strong> 본 자료의 내용을 근거로 한 투자 판단, 세금 신고, 기타 재무적 결정으로 발생하는 어떠한 직접·간접 손해에 대해서도 작성자는 법적 책임을 지지 않습니다.</p>
              <p><strong>외부 링크.</strong> 본 페이지에 포함된 외부 사이트 링크는 이용자의 편의를 위해 제공한 것이며, 해당 사이트의 내용을 보증하거나 그 정확성에 대해 책임지지 않습니다.</p>
            </div>
          </div>

          <div className="footer-update">
            최종 작성일: 2026년 2월 20일 · 세법 변경 시 업데이트가 필요할 수 있습니다.
          </div>

        </div>

      </div>
    </div>
  );
}
