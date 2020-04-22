import * as select from 'select-dom'
import * as ghInjection from 'github-injection'
import { ConfigProvider } from '../config'
import { ButtonInjector, InjectorBase, checkIsBtnUpToDate } from './injector'

namespace Githubify {
  export const NAV_BTN_ID = 'github-btn-nav'
  export const NAV_BTN_CLASS = 'github-nav-btn'
  export const NAV_BTN_CLASS_SELECTOR = '.' + NAV_BTN_CLASS
  export const GITHUB_FILE_BTN = 'github-file-btn'

  export const CSS_REF_BTN_CONTAINER = 'github-btn-container'
  export const CSS_REF_NO_CONTAINER = 'no-container'
}

/**
 * This implementation currently assumes that there is only ever one button per page
 */
export class GitHubInjector extends InjectorBase {
  constructor(configProvider: ConfigProvider) {
    super(configProvider, [
      new PullInjector(),
      new IssueInjector(),
      new FileInjector(),
      new NavigationInjector(),
      new EmptyRepositoryInjector()
    ])
  }

  canHandleCurrentPage(): boolean {
    // TODO Does this work for GitHub Enterprise, too?
    const metaTags = document.getElementsByTagName('meta')
    for (let i = 0; i < metaTags.length; i++) {
      const metaTag = metaTags[i]
      if (metaTag.name === 'hostname' && metaTag.content.includes('github')) {
        return true
      }
    }
    return false
  }

  checkIsInjected(): boolean {
    const button = document.getElementById(`${Githubify.NAV_BTN_ID}`)
    const currentUrl = this.renderUrl()
    return checkIsBtnUpToDate(button, currentUrl)
  }

  async inject(): Promise<void> {
    // ghInjection triggers an event whenever only parts of the GitHub page have been reloaded
    ghInjection(() => {
      this.injectButtons()
    })
  }

  async update(): Promise<void> {
    this.injectButtons()
  }
}

abstract class ButtonInjectorBase implements ButtonInjector {
  constructor(
    protected readonly parentSelector: string,
    protected readonly btnClasses: string,
    protected readonly asFirstChild: boolean = false
  ) {}

  abstract isApplicableToCurrentPage(): boolean

  inject(currentUrl: string) {
    const actionbar = select(this.parentSelector)
    if (!actionbar) {
      return
    }

    const oldBtn = document.getElementById(Githubify.NAV_BTN_ID)
    if (oldBtn && !checkIsBtnUpToDate(oldBtn, currentUrl)) {
      // Only add once
      ;(oldBtn as HTMLAnchorElement).href = currentUrl
      return
    }

    const btn = this.renderButton(currentUrl)

    const btnGroup = actionbar.getElementsByClassName('BtnGroup')
    if (btnGroup && btnGroup.length > 0 && btnGroup[0].classList.contains('float-right')) {
      actionbar.insertBefore(btn, btnGroup[0])
    } else if (this.asFirstChild && actionbar) {
      actionbar.insertBefore(btn, actionbar.firstChild)
    } else {
      actionbar.appendChild(btn)
    }
  }

  protected renderButton(url: string, float: boolean = true): HTMLElement {
    let classes = this.btnClasses + ` ${Githubify.NAV_BTN_CLASS}`
    if (float) {
      classes = classes + ` float-right`
    }

    const container = document.createElement('div')
    container.id = Githubify.CSS_REF_BTN_CONTAINER
    container.className = classes

    const a = document.createElement('a')
    a.id = Githubify.NAV_BTN_ID
    a.title = 'Open repo with'
    a.text = 'Open with turtul'
    a.href = url
    a.target = '_blank'
    a.className = 'btn btn-sm btn-primary'

    container.appendChild(a)
    return container
  }
}

class PullInjector extends ButtonInjectorBase {
  constructor() {
    super('.gh-header-actions', '')
  }

  isApplicableToCurrentPage(): boolean {
    return window.location.pathname.includes('/pull/')
  }
}

class IssueInjector extends ButtonInjectorBase {
  constructor() {
    super('.gh-header-actions', '')
  }

  isApplicableToCurrentPage(): boolean {
    return window.location.pathname.includes('/issues/')
  }
}

class FileInjector extends ButtonInjectorBase {
  constructor() {
    super('.repository-content > div', Githubify.GITHUB_FILE_BTN)
  }

  isApplicableToCurrentPage(): boolean {
    return window.location.pathname.includes('/blob/')
  }
}

class NavigationInjector extends ButtonInjectorBase {
  constructor() {
    super('.file-navigation', 'empty-icon position-relative')
  }

  isApplicableToCurrentPage(): boolean {
    return !!select.exists('.file-navigation')
  }
}

class EmptyRepositoryInjector extends ButtonInjectorBase {
  constructor() {
    super('.repository-content', Githubify.CSS_REF_NO_CONTAINER, true)
  }

  isApplicableToCurrentPage(): boolean {
    return !!select.exists('.js-git-clone-help-container')
  }
}
