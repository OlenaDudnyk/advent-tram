import { TestBed } from '@angular/core/testing';

import { Language } from '../../core/models';

import { InspirationLinkComponent, detectInspirationType } from './inspiration-link.component';

describe('InspirationLinkComponent', () => {
  it('detects the platform from the URL', () => {
    expect(detectInspirationType('https://www.pinterest.com/search/pins/?q=x')).toBe('pinterest');
    expect(detectInspirationType('https://www.youtube.com/results?search_query=x')).toBe('youtube');
    expect(detectInspirationType('https://youtu.be/abc')).toBe('youtube');
    expect(detectInspirationType('https://example.com')).toBe('link');
    expect(detectInspirationType('not a url')).toBe('link');
  });

  const render = (inspirationUrl: string | undefined, language = Language.English) => {
    const fixture = TestBed.createComponent(InspirationLinkComponent);
    fixture.componentRef.setInput('task', { inspirationUrl });
    fixture.componentRef.setInput('language', language);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders a safe, localized link that opens in a new tab', () => {
    const anchor = render('https://www.youtube.com/results?search_query=x', Language.Ukrainian).querySelector('a')!;
    expect(anchor.textContent).toContain('Дивитися відео-підказку');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders nothing without a URL or with an unsafe one', () => {
    expect(render(undefined).querySelector('a')).toBeNull();
    expect(render('javascript:alert(1)').querySelector('a')).toBeNull();
  });
});
